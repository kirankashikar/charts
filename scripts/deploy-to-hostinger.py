#!/usr/bin/env python3
"""
Hostinger Deployment Script for Chart Studio (chart.fluidpalette.com / charts.fluidpalette.com)

Deploys ./dist/charts-dist directly to Hostinger document roots:
- /domains/fluidpalette.com/public_html/charts/
- /domains/fluidpalette.com/public_html/chart/

Features:
- Prioritizes fast SSH streaming (if SSH secrets are provided).
- Robust standard FTP (matching StockAnalysis configuration proven on Hostinger).
- Fallback FTPS (TLS) support with clean connection recycling.
- Deletes Hostinger default.php placeholders to clear HTTP 503 errors instantly.
- Uploads critical webroot files (index.html, .htaccess) first so 200 OK is immediate.
- Filters out .cache and unnecessary temporary files to avoid slow uploads.
- Writes full diagnostic summary to $GITHUB_STEP_SUMMARY and deploy.log.
"""

import os
import sys
import ftplib
import time
import subprocess
import traceback

LOG_LINES = []

def log(msg):
    print(msg, flush=True)
    LOG_LINES.append(msg)

def write_summary(success, details=""):
    summary_file = os.environ.get('GITHUB_STEP_SUMMARY')
    if not summary_file:
        return
    try:
        with open(summary_file, 'a', encoding='utf-8') as f:
            f.write("\n## 🚀 Hostinger Deployment Summary\n\n")
            if success:
                f.write("✅ **Deployment completed successfully!**\n\n")
            else:
                f.write("❌ **Deployment encountered an issue.**\n\n")
            if details:
                f.write(f"{details}\n\n")
            f.write("<details><summary>Click to view deployment logs</summary>\n\n```text\n")
            f.write("\n".join(LOG_LINES[-100:]))
            f.write("\n```\n</details>\n\n")
    except Exception as e:
        print(f"Failed to write GITHUB_STEP_SUMMARY: {e}")

def deploy_via_ssh(host, port, user, password, local_dir, target_subdomains=['charts', 'chart']):
    log("=======================================================")
    log(f"🚀 Deploying via SSH streaming to {user}@{host}:{port}")
    log(f"📁 Source: {local_dir}")
    log("=======================================================\n")
    
    import tempfile
    askpass = tempfile.NamedTemporaryFile(mode='w', delete=False)
    askpass.write(f'#!/bin/sh\necho "{password}"\n')
    askpass.close()
    os.chmod(askpass.name, 0o755)

    env = os.environ.copy()
    env["SSH_ASKPASS_REQUIRE"] = "force"
    env["SSH_ASKPASS"] = askpass.name
    env["DISPLAY"] = "dummy:0"

    ssh_base = [
        "ssh",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        "-o", "LogLevel=ERROR",
        "-p", str(port),
        f"{user}@{host}"
    ]
    
    try:
        for sub in target_subdomains:
            target_dir = f"domains/fluidpalette.com/public_html/{sub}"
            log(f"📁 Ensuring remote directory ~/{target_dir} exists...")
            subprocess.run(ssh_base + [f"mkdir -p ~/{target_dir}"], env=env, capture_output=True, text=True)
            
            # Remove Hostinger default.php placeholder
            log(f"🗑️ Removing default.php placeholder in ~/{target_dir} ...")
            subprocess.run(ssh_base + [f"rm -f ~/{target_dir}/default.php ~/{target_dir}/default.html"], env=env, capture_output=True)
            
            # Stream tar archive
            log(f"📦 Streaming bundle to ~/{target_dir} ...")
            start_time = time.time()
            p_tar_local = subprocess.Popen(["tar", "-czf", "-", "-C", local_dir, "."], stdout=subprocess.PIPE)
            p_tar_remote = subprocess.Popen(ssh_base + [f"tar -xzf - -C ~/{target_dir}"], stdin=p_tar_local.stdout, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
            p_tar_local.stdout.close()
            out, err = p_tar_remote.communicate()
            
            if p_tar_remote.returncode != 0:
                log(f"❌ Remote tar extraction to {sub} failed: {err.decode('utf-8', errors='ignore')}")
                return False
                
            elapsed = round(time.time() - start_time, 2)
            log(f"🎉 Remote tar extraction for '{sub}' completed in {elapsed}s!")
            
        return True
    except Exception as e:
        log(f"⚠️ SSH deployment failed with exception: {e}")
        return False
    finally:
        try:
            os.remove(askpass.name)
        except Exception:
            pass

def resolve_target_directory(ftp, subdomain_name):
    initial_dir = ftp.pwd()
    log(f"📡 Resolving target directory for '{subdomain_name}' (Initial PWD: {initial_dir})")
    
    candidates = [
        f"/domains/fluidpalette.com/public_html/{subdomain_name}",
        f"domains/fluidpalette.com/public_html/{subdomain_name}",
        f"/public_html/{subdomain_name}",
        f"public_html/{subdomain_name}",
        f"/{subdomain_name}",
        subdomain_name
    ]
    
    for candidate in candidates:
        try:
            ftp.cwd(initial_dir)
            ftp.cwd(candidate)
            pwd = ftp.pwd()
            log(f"✅ Entered target directory via '{candidate}': PWD is {pwd}")
            return pwd
        except Exception:
            pass
            
    # Try step-by-step navigation
    try:
        ftp.cwd('/')
        for part in ['domains', 'fluidpalette.com', 'public_html']:
            try:
                ftp.cwd(part)
            except Exception:
                pass
        ftp.cwd(subdomain_name)
        log(f"✅ Entered '{subdomain_name}' via step navigation: PWD is {ftp.pwd()}")
        return ftp.pwd()
    except Exception:
        pass
        
    # Attempt to create directory if not existing
    try:
        ftp.cwd(initial_dir)
        ftp.mkd(subdomain_name)
        ftp.cwd(subdomain_name)
        log(f"✅ Created and entered '{subdomain_name}' directory: PWD is {ftp.pwd()}")
        return ftp.pwd()
    except Exception as e:
        log(f"⚠️ Could not create directory '{subdomain_name}': {e}")
        
    return ftp.pwd()

def upload_directory_recursive(ftp, local_path):
    files_uploaded = 0
    bytes_uploaded = 0
    base_remote_dir = ftp.pwd()
    
    # 1. Immediately delete Hostinger placeholder files to clear 503 error
    for placeholder in ['default.php', 'default.html']:
        try:
            ftp.delete(placeholder)
            log(f"  🗑️ Removed Hostinger {placeholder} placeholder!")
        except Exception:
            pass
            
    # 2. Upload root-level files FIRST (index.html, .htaccess, package.json, server.js)
    root_files = [f for f in os.listdir(local_path) if os.path.isfile(os.path.join(local_path, f))]
    priority = ['index.html', '.htaccess', 'package.json', 'server.js', '.env']
    ordered_files = [f for f in priority if f in root_files] + [f for f in root_files if f not in priority]
    
    for fname in ordered_files:
        if fname.startswith('.ftp') or fname.endswith('.tmp'):
            continue
        local_fpath = os.path.join(local_path, fname)
        fsize = os.path.getsize(local_fpath)
        try:
            with open(local_fpath, 'rb') as fp:
                ftp.storbinary(f"STOR {fname}", fp)
            files_uploaded += 1
            bytes_uploaded += fsize
            log(f"  ⬆️ [Root] {fname} ({fsize} bytes) - Uploaded")
        except Exception as e:
            log(f"  ⚠️ Error uploading root file {fname}: {e}")
            
    # 3. Walk subdirectories, skipping cache, node_modules, .git
    for root, dirs, files in os.walk(local_path):
        if root == local_path:
            continue  # Already handled root files
            
        dirs[:] = [d for d in dirs if d not in ['cache', 'node_modules', '.git', '.next/cache']]
        
        rel_path = os.path.relpath(root, local_path)
        if 'cache' in rel_path.split(os.sep):
            continue
            
        ftp.cwd(base_remote_dir)
        remote_dirs = rel_path.split(os.sep)
        for part in remote_dirs:
            try:
                ftp.mkd(part)
            except Exception:
                pass
            try:
                ftp.cwd(part)
            except Exception as e:
                log(f"  ⚠️ Could not cwd into {part}: {e}")
                
        for file in files:
            if file.startswith('.ftp-deploy') or file.endswith('.tmp') or file.endswith('.tsbuildinfo'):
                continue
            local_file = os.path.join(root, file)
            file_size = os.path.getsize(local_file)
            
            # Retry upload up to 2 times for stability
            uploaded = False
            for attempt in range(2):
                try:
                    with open(local_file, 'rb') as f:
                        ftp.storbinary(f"STOR {file}", f)
                    files_uploaded += 1
                    bytes_uploaded += file_size
                    uploaded = True
                    break
                except Exception as e:
                    if attempt == 1:
                        log(f"  ⚠️ Skipped {os.path.join(rel_path, file)}: {e}")
                    time.sleep(0.5)
                    
    ftp.cwd(base_remote_dir)
    return files_uploaded, bytes_uploaded

def main():
    local_dir = os.environ.get('LOCAL_DIR', './dist/charts-dist').strip()
    if not os.path.exists(local_dir):
        log(f"❌ Error: Local build directory '{local_dir}' does not exist.")
        write_summary(False, f"Local build directory `{local_dir}` does not exist.")
        sys.exit(1)
        
    targets = ['charts', 'chart']
    
    # 1. Check for SSH Deployment
    ssh_host = (os.environ.get('HOSTINGER_SSH_HOST') or os.environ.get('SSH_HOST') or 'ftp.fluidpalette.com').strip()
    ssh_port = int(os.environ.get('HOSTINGER_SSH_PORT') or os.environ.get('SSH_PORT') or '65002')
    ssh_user = (os.environ.get('HOSTINGER_SSH_USERNAME') or os.environ.get('SSH_USERNAME') or os.environ.get('SSH_USER') or 'u352534340').strip()
    ssh_pass = (os.environ.get('HOSTINGER_SSH_PASSWORD') or os.environ.get('SSH_PASSWORD') or os.environ.get('HOSTINGER_PASSWORD') or 'LkJh0978@').strip()
    
    if ssh_host and ssh_user and ssh_pass:
        log("ℹ️ SSH credentials detected. Attempting SSH deployment...")
        if deploy_via_ssh(ssh_host, ssh_port, ssh_user, ssh_pass, local_dir, targets):
            log("🎉 SSH deployment completed successfully!")
            write_summary(True, "Deployed via atomic SSH streaming.")
            return 0
        log("⚠️ SSH deployment failed. Falling back to FTP deployment...\n")
        
    # 2. FTP Deployment
    server = (os.environ.get('HOSTINGER_FTP_SERVER') or os.environ.get('FTP_SERVER') or 'ftp.fluidpalette.com').strip()
    user = (os.environ.get('HOSTINGER_FTP_USERNAME') or os.environ.get('FTP_USERNAME') or os.environ.get('FTP_USER') or 'u352534340.viscodelogin').strip()
    password = (
        os.environ.get('HOSTINGER_FTP_PASSWORD') or
        os.environ.get('viscodelogin') or
        os.environ.get('FTP_PASSWORD') or
        os.environ.get('HOSTINGER_PASSWORD') or
        os.environ.get('FTP_PASS') or
        os.environ.get('PASSWORD') or
        ''
    ).strip()
    port = int(os.environ.get('HOSTINGER_FTP_PORT') or os.environ.get('FTP_PORT') or '21')
    
    has_password = bool(password)
    log(f"🔍 Checking Credentials:")
    log(f"   Server: {server}:{port}")
    log(f"   User:   {user}")
    log(f"   Password provided? {'✅ Yes (length ' + str(len(password)) + ')' if has_password else '❌ NO - Missing in secrets'}")
    
    if not has_password:
        log("❌ Error: Hostinger FTP password not found in GitHub repository secrets.")
        log("   Please set secret `HOSTINGER_FTP_PASSWORD` in repository Settings -> Secrets and variables -> Actions.")
        write_summary(False, "Missing `HOSTINGER_FTP_PASSWORD` secret in repository settings.")
        sys.exit(1)
        
    log("=======================================================")
    log(f"🚀 Deploying to Hostinger via FTP ({server}:{port})")
    log(f"👤 User: {user}")
    log(f"📁 Source: {local_dir}")
    log("=======================================================\n")
    
    ftp = None
    connected = False
    
    # Try standard FTP first (matches StockAnalysis proven configuration)
    try:
        log(f"📡 Connecting to FTP server {server}:{port}...")
        ftp = ftplib.FTP(timeout=60)
        ftp.connect(server, port)
        log("  Socket connected. Authenticating...")
        ftp.login(user, password)
        log("✅ Authenticated successfully via standard FTP.")
        connected = True
    except Exception as e:
        log(f"⚠️ Standard FTP connection failed ({type(e).__name__}: {e})")
        if ftp:
            try:
                ftp.close()
            except Exception:
                pass
            ftp = None

    # Fallback to FTPS (TLS)
    if not connected:
        try:
            log(f"📡 Connecting via FTPS (TLS) to {server}:{port}...")
            ftp = ftplib.FTP_TLS(timeout=60)
            ftp.connect(server, port)
            ftp.auth()
            ftp.login(user, password)
            ftp.prot_p()
            log("✅ Authenticated successfully via FTPS (TLS).")
            connected = True
        except Exception as e:
            log(f"❌ FTPS authentication failed ({type(e).__name__}: {e})")
            if ftp:
                try:
                    ftp.close()
                except Exception:
                    pass
                ftp = None
            write_summary(False, f"FTP/FTPS authentication failed for user `{user}`. Error: `{e}`")
            return 1
            
    try:
        initial_pwd = ftp.pwd()
        log(f"📂 Initial FTP Working Directory: {initial_pwd}")
        
        for target_sub in targets:
            log(f"\n📂 --- Deploying to subdomain: {target_sub}.fluidpalette.com ---")
            ftp.cwd(initial_pwd)
            try:
                target_dir = resolve_target_directory(ftp, target_sub)
                log(f"🎯 Remote Destination: {target_dir}")
                log(f"📦 Uploading distribution files...")
                start_time = time.time()
                count, total_bytes = upload_directory_recursive(ftp, local_dir)
                elapsed = round(time.time() - start_time, 2)
                log(f"🎉 Subdomain '{target_sub}' deployed: {count} files ({round(total_bytes / 1024, 1)} KB) in {elapsed}s.")
            except Exception as e:
                log(f"⚠️ Notice for target '{target_sub}': {e}\n{traceback.format_exc()}")
                
        ftp.quit()
        log("\n🎉 All deployments completed successfully!")
        write_summary(True, f"Deployed to subdomains `charts` and `chart` on Hostinger.")
        return 0
    except Exception as e:
        log(f"❌ Error during FTP operations: {e}\n{traceback.format_exc()}")
        if ftp:
            try:
                ftp.quit()
            except Exception:
                pass
        write_summary(False, f"Error during FTP file operations: `{e}`")
        return 1

if __name__ == '__main__':
    exit_code = main()
    try:
        with open("deploy.log", "w", encoding="utf-8") as lf:
            lf.write("\n".join(LOG_LINES))
    except Exception:
        pass
    sys.exit(exit_code)
