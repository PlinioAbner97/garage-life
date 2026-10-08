# Renderiza el fondo del garaje (sin autos) con margenes extra alrededor del encuadre original,
# sin cambiar la proyeccion de la camara: los pixeles originales (0..1920 x 0..1080) quedan en el mismo sitio
# y los sprites de los autos siguen encajando. El juego coloca la imagen en (-left, -top).
#
#   BLEND=cartown.blend1 MARGINS=top,left,right,bottom OUT=out [PCT=50 SAMPLES=24] \
#   python3 -c "exec(open('tools/render_bg.py').read())"
import os
RL = os.environ.get('RL_PATH', os.path.join(os.getcwd(), 'tools', 'rl.py'))
exec(open(RL).read())
import numpy as np
from PIL import Image

OUT = os.environ.get('OUT', 'out'); os.makedirs(OUT, exist_ok=True)
top, left, right, bottom = [int(v) for v in os.environ.get('MARGINS', '0,0,0,0').split(',')]
pct = int(os.environ.get('PCT', '100'))
name = os.environ.get('NAME', 'garage_bg_ext')

sc = setup(int(os.environ.get('SAMPLES', '96')))
ecl, sub = car_objects()
for o in ecl | sub:
    o.hide_render = True
bpy.data.objects['Circle.001'].hide_render = True

NW, NH = W + left + right, H + top + bottom
cam = sc.camera
orig_scale = cam.data.ortho_scale
# la escala ortografica se aplica a la dimension mayor (ancho): mantenerla proporcional conserva px/unidad
cam.data.sensor_fit = 'HORIZONTAL'
cam.data.ortho_scale = orig_scale * NW / W
cam.data.shift_x = ((right - left) / 2) / NW
cam.data.shift_y = ((top - bottom) / 2) / NW
sc.render.resolution_x = NW; sc.render.resolution_y = NH; sc.render.resolution_percentage = pct
sc.render.filepath = f'{OUT}/{name}.png'
bpy.ops.render.render(write_still=True)
a = np.array(Image.open(f'{OUT}/{name}.png').convert('RGBA'))[..., 3] > 8
ys, xs = np.where(a); k = 100 / pct
print('SIZE', NW, NH, 'ALPHA_BBOX(full-res px, extended frame)', int(xs.min() * k), int(ys.min() * k), int(xs.max() * k), int(ys.max() * k), flush=True)
print('MARGINS', top, left, right, bottom, flush=True)
