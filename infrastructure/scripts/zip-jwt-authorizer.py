import zipfile, os
src = 'vote-capsule/infrastructure/lambda/jwt-authorizer/index.js'
dst = 'vote-capsule/infrastructure/lambda/jwt-authorizer/auth.zip'
with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(src, 'index.js')
print('Created', dst, os.path.getsize(dst), 'bytes')
