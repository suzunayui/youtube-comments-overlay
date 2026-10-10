from pathlib import Path
import sys
from PyInstaller.utils.hooks import collect_all
root = Path(SPECPATH).parent
datas, binaries, hiddenimports = [], [], []
for package in ('faster_whisper', 'ctranslate2', 'onnxruntime', 'tokenizers', 'av', 'certifi'):
    d, b, h = collect_all(package)
    datas += d; binaries += b; hiddenimports += h
vendor = Path(sys.prefix) / 'Lib/site-packages/nvidia'
for dll in vendor.glob('**/bin/*.dll'):
    binaries.append((str(dll), str(Path('nvidia') / dll.relative_to(vendor).parent)))
a = Analysis([str(root / 'subtitles/backend/worker.py')],pathex=[str(root / 'subtitles/backend')],
    datas=datas,binaries=binaries,hiddenimports=hiddenimports,
    excludes=['torch','tensorflow','langid','lingua','sentencepiece','speech_recognition','deepl','dotenv','pytest','IPython','matplotlib'])
pyz = PYZ(a.pure)
exe = EXE(pyz,a.scripts,[],exclude_binaries=True,name='subtitle-worker',console=True,icon=str(root / 'translation/icon.ico'))
coll = COLLECT(exe,a.binaries,a.datas,name='subtitle-worker')
