import asyncio
from io import BytesIO

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

from request_limits import MAX_IMAGE_BYTES

register_heif_opener(thumbnails=False, depth_images=False, aux_images=False)
FORMATS = ("JPEG", "PNG", "WEBP", "HEIF")
MAX_PIXELS = 20_000_000
MAX_SIDE = 2048


def normalize_image(payload: bytes, index: int) -> bytes:
    try:
        with Image.open(BytesIO(payload), formats=FORMATS) as image:
            if image.width * image.height > MAX_PIXELS:
                raise HTTPException(422, f"Foto {index} acima de 20 megapixels.")
            if getattr(image, "n_frames", 1) != 1:
                raise HTTPException(415, f"Foto {index} contém múltiplos quadros. Use uma imagem estática.")
            ImageOps.exif_transpose(image, in_place=True)
            image.thumbnail((MAX_SIDE, MAX_SIDE))
            rgb = Image.new("RGB", image.size, "white")
            if image.has_transparency_data:
                rgba = image.convert("RGBA")
                rgb.paste(rgba, mask=rgba.getchannel("A"))
            else:
                rgb.paste(image.convert("RGB"))
            output = BytesIO()
            rgb.save(output, format="JPEG", quality=88)
            return output.getvalue()
    except Image.DecompressionBombError as exc:
        raise HTTPException(422, f"Foto {index} acima de 20 megapixels.") from exc
    except (OSError, ValueError, SyntaxError, RuntimeError, EOFError) as exc:
        raise HTTPException(415, f"Foto {index} inválida. Use JPEG, PNG, WebP ou HEIC/HEIF estático.") from exc


async def prepare_photo(photo: UploadFile, index: int) -> bytes:
    payload = await photo.read(MAX_IMAGE_BYTES + 1)
    if not payload:
        raise HTTPException(422, f"Foto {index} vazia.")
    if len(payload) > MAX_IMAGE_BYTES:
        raise HTTPException(413, f"Foto {index} acima de 3 MiB.")
    return await asyncio.to_thread(normalize_image, payload, index)
