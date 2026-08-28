#!/usr/bin/env python3
import zipfile, os
src = 'vote-capsule/infrastructure/lambda/campaign-media-processor/index.js'
dst = 'vote-capsule/infrastructure/lambda/campaign-media-processor/func.zip'
with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(src, 'index.js')
sz = os.path.getsize(dst)
print('Created', dst, sz, 'bytes')
