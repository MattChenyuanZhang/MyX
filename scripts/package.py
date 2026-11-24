"""Package only extension runtime files; never browser data, fixtures, or Git state."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parent.parent
out=root/'artifacts'/'myx-extension.zip'
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as archive:
    for file in sorted((root/'extension').iterdir()):
        if file.is_file() and file.suffix in {'.js','.json','.html','.css','.png'}:
            archive.write(file,file.name)
print(out)
