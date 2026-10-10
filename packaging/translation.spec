from pathlib import Path
from PyInstaller.utils.hooks import collect_all
root = Path(SPECPATH).parent
datas, binaries, hiddenimports = [], [], []
for package in ('langid', 'lingua', 'numpy', 'huggingface_hub', 'hf_xet', 'certifi'):
    d, b, h = collect_all(package)
    datas += d; binaries += b; hiddenimports += h
a = Analysis([str(root / 'translation/backend/worker.py')],
    pathex=[str(root / 'translation/backend')], datas=datas, binaries=binaries, hiddenimports=hiddenimports,
    excludes=['torch','tensorflow','faster_whisper','ctranslate2','sounddevice','onnxruntime','sentencepiece','pytest','IPython','matplotlib'])
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, [], exclude_binaries=True, name='translation-worker', console=True,
    icon=str(root / 'translation/icon.ico'))
coll = COLLECT(exe, a.binaries, a.datas, name='translation-worker')
