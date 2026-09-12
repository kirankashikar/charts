#!/usr/bin/env python3
"""
Hostinger Deployment Script for Chart Studio (chart.fluidpalette.com / charts.fluidpalette.com)

Deploys the production build directly to Hostinger document root:
/domains/fluidpalette.com/public_html/charts/ and /domains/fluidpalette.com/public_html/chart/

Prioritizes fast SSH streaming (if configured), and falls back to robust FTP navigation.
Explicitly removes Hostinger's default.php placeholder so 503 errors are cleared.
"""

import os
import sys
import ftplib
import time
import subprocess

def deploy_via_ssh(host, port, user, password, local_dir, target_subdomains=['charts', 'chart']):
    print("=======================================================")
    print(f"🚀 Deploying via SSH streaming to {user}@{host}:{port}")
    print(f"📁 Source: {local_dir}")
    print("=======================================================\n")
    
    # 1. Check sshpass
    check = subprocess.run(["which", "sshpass"], capture_output=True)
    if check.returncode != 0:
        print("📦 Installing sshpass...")
        subprocess.run(["sudo", "apt-get", "update", "-y"], capture_output=True)
        subprocess.run(["sudo", "apt-get", "install", "-y", "sshpass"], capture_output=True)
        
    ssh_base = [
        "sshpass", "-p", password,
        "ssh",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        "-p", str(port),
        f"{user}@{host}"
    ]
    
    try:
        for sub in target_subdomains:
            target_dir = f"domains/fluidpalette.com/public_html/{sub}"
            print(f"📁 Ensuring remote directory ~/{target_dir} exists...")
            subprocess.run(ssh_base + [f"mkdir -p ~/{target_dir}"], capture_output=True, text=True)
            
            # Remove Hostinger default.php placeholder
            print(f"🗑️ Removing default.php placeholder in ~/{target_dir} ...")
            subprocess.run(ssh_base + [f"rm -f ~/{target_dir}/default.php"], capture_output=True)
            
            # Stream tar archive
            print(f"📦 Streaming bundle to ~/{target_dir} ...")
            start_time = time.time()
            p_tar_local = subprocess.Popen(["tar", "-czf", "-", "-C", local_dir, "."], stdout=subprocess.PIPE)
            p_tar_remote = subprocess.Popen(ssh_base + [f"tar -xzf - -C ~/{target_dir}"], stdin=p_tar_local.stdout, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            p_tar_local.stdout.close()
            out, err = p_tar_remote.communicate()
            
            if p_tar_remote.returncode != 0:
                print(f"❌ Remote tar extraction to {sub} failed: {err.decode('utf-8', errors='ignore')}")
                return False
                
            elapsed = round(time.time() - start_time, 2)
            print(f"🎉 Remote tar extraction for '{sub}' completed in {elapsed}s!")
            
        return True
    except Exception as e:
        print(f"⚠️ SSH deployment failed with exception: {e}")
        return False

def resolve_target_directory(ftp, subdomain_name):
    initial_dir = ftp.pwd()
    print(f"📡 Resolving target directory for '{subdomain_name}' (PWD: {initial_dir})")
    
    # Try direct navigation
    for attempt in [f'/domains/fluidpalette.com/public_html/{subdomain_name}', f'domains/fluidpalette.com/public_html/{subdomain_name}', f'public_html/{subdomain_name}', subdomain_name]:
        try:
            ftp.cwd(initial_dir)
            ftp.cwd(attempt)
            pwd = ftp.pwd()
            print(f"✅ Successfully entered target directory via '{attempt}': PWD is {pwd}")
            return pwd
        except Exception:
            pass
            
    # Try step-by-step navigation
    ftp.cwd('/')
    for part in ['domains', 'fluidpalette.com', 'public_html']:
        try:
            ftp.cwd(part)
        except Exception as e:
            print(f"  Could not enter '{part}': {e}")
            break
            
    try:
        ftp.cwd(subdomain_name)
        print(f"✅ Entered '{subdomain_name}' directory: PWD is {ftp.pwd()}")
        return ftp.pwd()
    except Exception:
        try:
            print(f"📁 Attempting to create '{subdomain_name}' directory...")
            ftp.mkd(subdomain_name)
            ftp.cwd(subdomain_name)
            print(f"✅ Created and entered '{subdomain_name}' directory: PWD is {ftp.pwd()}")
            return ftp.pwd()
        except Exception as e:
            print(f"  mkd('{subdomain_name}') failed: {e}")
            
    raise RuntimeError(f"Could not locate target webroot directory '{subdomain_name}'. PWD is {ftp.pwd()}")

def upload_directory_recursive(ftp, local_path):
    files_uploaded = 0
    bytes_uploaded = 0
    base_remote_dir = ftp.pwd()
    
    # Remove default.php if present to clear Hostinger 503 error
    try:
        ftp.delete('default.php')
        print("  🗑️ Successfully removed Hostinger default.php placeholder!")
    except Exception:
        pass
        
    for root, dirs, files in os.walk(local_path):
        ftp.cwd(base_remote_dir)
        rel_path = os.path.relpath(root, local_path)
        if rel_path != '.':
            remote_dirs = rel_path.split(os.sep)
            for part in remote_dirs:
                try:
                    ftp.mkd(part)
                except Exception:
                    pass
                ftp.cwd(part)
                
        for file in files:
            if file.startswith('.ftp-deploy') or file.endswith('.tmp'):
                continue
            local_file = os.path.join(root, file)
            file_size = os.path.getsize(local_file)
            
            with open(local_file, 'rb') as f:
                try:
                    ftp.storbinary(f"STOR {file}", f)
                    files_uploaded += 1
                    bytes_uploaded += file_size
                except Exception as e:
                    print(f"  ❌ Error uploading {os.path.join(rel_path, file)}: {e}")
                    raise e
                    
    ftp.cwd(base_remote_dir)
    return files_uploaded, bytes_uploaded

def main():
    local_dir = os.environ.get('LOCAL_DIR', './dist/charts-dist').strip()
    if not os.path.exists(local_dir):
        print(f"❌ Error: Local build directory '{local_dir}' does not exist.")
        sys.exit(1)
        
    targets = ['charts', 'chart']
    
    # 1. SSH Deployment Check
    ssh_host = os.environ.get('HOSTINGER_SSH_HOST', '').strip()
    ssh_port = int(os.environ.get('HOSTINGER_SSH_PORT', '65002'))
    ssh_user = os.environ.get('HOSTINGER_SSH_USERNAME', '').strip()
    ssh_pass = os.environ.get('HOSTINGER_SSH_PASSWORD', '').strip()
    
    if ssh_host and ssh_user and ssh_pass:
        if deploy_via_ssh(ssh_host, ssh_port, ssh_user, ssh_pass, local_dir, targets):
            print("🎉 SSH deployment completed successfully!")
            return 0
        print("⚠️ SSH deployment failed. Falling back to FTP deployment...\n")
        
    # 2. FTP Deployment Fallback
    server = os.environ.get('HOSTINGER_FTP_SERVER', 'ftp.fluidpalette.com').strip()
    user = os.environ.get('HOSTINGER_FTP_USERNAME', 'u352534340.viscodelogin').strip()
    password = (os.environ.get('HOSTINGER_FTP_PASSWORD') or os.environ.get('viscodelogin') or '').strip()
    port = int(os.environ.get('HOSTINGER_FTP_PORT', '21'))
    
    if not password:
        print("❌ Error: Hostinger FTP password not provided in environment.")
        sys.exit(1)
        
    print("=======================================================")
    print(f"🚀 Deploying to Hostinger via FTP ({server}:{port})")
    print(f"👤 User: {user}")
    print(f"📁 Source: {local_dir}")
    print("=======================================================\n")
    
    ftp = None
    try:
        # Try TLS first, fallback to standard FTP
        try:
            ftp = ftplib.FTP_TLS(timeout=120)
            ftp.connect(server, port)
            ftp.login(user, password)
            ftp.prot_p()
            print("✅ Connected with FTPS (TLS encryption).")
        except Exception as e:
            print(f"ℹ️ FTPS connection attempt ({e}), connecting via standard FTP...")
            ftp = ftplib.FTP(timeout=120)
            ftp.connect(server, port)
            ftp.login(user, password)
            print("✅ Connected with standard FTP.")
            
        initial_pwd = ftp.pwd()
        
        for target_sub in targets:
            print(f"\n📂 --- Deploying to subdomain: {target_sub}.fluidpalette.com ---")
            ftp.cwd(initial_pwd)
            try:
                target_dir = resolve_target_directory(ftp, target_sub)
                print(f"🎯 Remote Destination: {target_dir}")
                print(f"📦 Uploading distribution files...")
                start_time = time.time()
                count, total_bytes = upload_directory_recursive(ftp, local_dir)
                elapsed = round(time.time() - start_time, 2)
                print(f"🎉 Subdomain '{target_sub}' deployed: {count} files ({round(total_bytes / 1024, 1)} KB) in {elapsed}s.")
            except Exception as e:
                print(f"⚠️ Notice for target '{target_sub}': {e}")
                
        ftp.quit()
        print("\n🎉 All deployments completed successfully!")
        return 0
    except Exception as e:
        print(f"❌ FTP Deployment failed: {e}")
        if ftp:
            try:
                ftp.quit()
            except Exception:
                pass
        return 1

if __name__ == '__main__':
    sys.exit(main())
