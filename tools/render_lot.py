# Renderiza el LOTE ampliado (GL_CARTOWN_GARAGE_V8 + calles GL_GARAGE_STREETS_V11) con la camara del juego.
# El garaje original NO se dibuja aqui: el juego lo pone encima con garage_bg.png (mismas coordenadas).
#
#   BLEND=new.blend MODE=lot|streets MARGINS=top,left,right,bottom OUT=out [PCT=100 SAMPLES=24 NAME=lot] \
#   (lot: suelo de 6 zonas + paredes; streets: calles/aceras V11 por separado, se renderiza a menor resolucion)\
#   python3 -c "exec(open('tools/render_lot.py').read())"
import os
RL = os.environ.get('RL_PATH', os.path.join(os.getcwd(), 'tools', 'rl.py'))
exec(open(RL).read())
import numpy as np
from PIL import Image

OUT = os.environ.get('OUT', 'out'); os.makedirs(OUT, exist_ok=True)
top, left, right, bottom = [int(v) for v in os.environ.get('MARGINS', '0,0,0,0').split(',')]
pct = int(os.environ.get('PCT', '100')); MODE = os.environ.get('MODE', 'lot'); name = os.environ.get('NAME', MODE)
sc = setup(int(os.environ.get('SAMPLES', '24')))
cam = bpy.data.objects['Garage Life Camera']
cam.location = (15.8, -19.8, 14.2); cam.rotation_euler = (1.08877, 0.0, 0.659)
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 25.5; cam.data.sensor_fit = 'AUTO'; cam.data.shift_x = 0; cam.data.shift_y = 0
sc.camera = cam
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'; sc.view_settings.exposure = 0.0

def objs(col): return [o for o in bpy.data.collections[col].all_objects if o]
def show(o, v): o.hide_set(not v); o.hide_viewport = not v; o.hide_render = not v
# fuera: garaje original (se pone aparte), ciudad vieja, tienda, taller antiguo, versiones previas
for c in ('Collection', 'GL_TOKYO_CITY_V1', 'GL_TOKYO_STREETS_V31', 'GL_TOKYO_NEON_V33', 'GL_GARAGE_EXPANSION_V2', 'GL_WORKSHOP_LEVEL1', 'GL_WORKSHOP_OPENING', 'GL_WORKSHOP_ENTRANCE_V2', 'GL_CARTOWN_RECTANGULAR_V6',
          'GL_SHOP_ASSETS_V10'):
    for o in objs(c):
        if o.type != 'LIGHT': show(o, False)
for o in objs('GL_GARAGE_STREETS_V11' if MODE == 'lot' else 'GL_CARTOWN_GARAGE_V8'): show(o, False)
for o in objs('GL_CARTOWN_GARAGE_V8' if MODE == 'lot' else 'GL_GARAGE_STREETS_V11'): show(o, True)

# materiales: los de V8/V11 vienen en gris por defecto; se les da el estilo del garaje original (solo en el render)
def pbsdf(name, color, rough, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    n = [x for x in m.node_tree.nodes if x.bl_idname == 'ShaderNodeBsdfPrincipled'][0]
    n.inputs['Base Color'].default_value = color; n.inputs['Roughness'].default_value = rough; n.inputs['Metallic'].default_value = metal
    return m
floor = pbsdf('R_LotFloor', (0.05, 0.06, 0.08, 1), float(os.environ.get('FROUGH', '0.24')), 0.18); wall = bpy.data.materials['Dark Walls']   # floor = material 'Garage Floor' del garaje original
asph = pbsdf('R_Asphalt', (0.018, 0.02, 0.024, 1), 0.78); conc = pbsdf('R_Concrete', (0.11, 0.115, 0.125, 1), 0.85); yel = pbsdf('R_Yellow', (0.75, 0.52, 0.04, 1), 0.55)
# luz de relleno suave sobre el lote (el garaje original trae sus propias luces solo sobre su zona)
ld = bpy.data.lights.new('LotFill', 'AREA'); ld.shape = 'SQUARE'; ld.size = 70; ld.energy = float(os.environ.get('FILL', '14000')); ld.color = (0.8, 0.88, 1.0)
lo = bpy.data.objects.new('LotFill', ld); lo.location = (0, 0, 32); bpy.context.scene.collection.objects.link(lo)
if os.environ.get('GRID'):
    # mismas luces de techo del garaje original (techo y taller), repetidas en rejilla: el suelo se ve igual en todo el lote
    ld.energy = 0
    for gx in range(-24, 25, 4):
        for gy in (-14, 0, 14):
            for (nm, dy, z, en, sx, sy, col) in (('C', 0.0, 6.8, 900, 4.0, 1.0, (0.82, 0.9, 1.0)), ('W', 2.2, 5.4, 450, 2.4, 0.4, (0.72, 0.84, 1.0))):
                l = bpy.data.lights.new('G' + nm, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = en * float(os.environ.get('GRID')); l.color = col
                ob = bpy.data.objects.new('G' + nm, l); ob.location = (gx, gy + dy, z); bpy.context.scene.collection.objects.link(ob)
MAP = {'GL_V8_Floor': floor, 'GL_V8_Wall': wall, 'GL_V11_Asphalt': asph, 'GL_V11_Concrete': conc, 'GL_V11_Yellow': yel}
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    for sl in o.material_slots:
        if sl.material and sl.material.name in MAP: sl.material = MAP[sl.material.name]
# Paredes como las del garaje original: muro oscuro de 6 m, zocalo metalico, tuberias, viga de techo y columnas azules cada 4.5 m.
if MODE == 'lot':
    def gm(name, c, r, m):
        return pbsdf(name, (*c, 1), r, m)
    M_STEEL = gm('K_Steel', (0.2, 0.23, 0.27), 0.22, 0.85); M_DARK = gm('K_DarkMetal', (0.03, 0.04, 0.05), 0.28, 0.75)
    M_BLUE = gm('K_Blue', (0.01, 0.16, 0.42), 0.25, 0.65); M_PIPE = gm('K_Pipes', (0.09, 0.1, 0.11), 0.22, 0.85)
    def box(name, cx, cy, cz, sx, sy, sz, mat, cyl=False):
        if cyl: bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=1, location=(cx, cy, cz), vertices=16)
        else: bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz))
        o = bpy.context.object; o.name = name; o.scale = (sx, sy, sz); o.data.materials.append(mat); return o
    for o in bpy.data.objects:
        if o.name == 'GL_V8_WALL_BACK': o.location = (0, 20.7, 2.8); o.dimensions = (48, 0.36, 6)
        if o.name == 'GL_V8_WALL_LEFT': o.location = (-24, 0, 2.8); o.dimensions = (0.36, 42, 6)
    def kit(axis, face, inward, lo, hi, skip=None):
        """axis 'y': muro a lo largo de X en y=face (inward = -1: el interior esta hacia -Y). axis 'x': muro a lo largo de Y en x=face."""
        L = hi - lo; mid = (lo + hi) / 2
        def P(along, d, z, sa, sd, sz, mat, name, cyl=False):
            a, dd = (along, face + inward * d)
            if axis == 'y': return box(name, a, dd, z, sa, sd, sz, mat, cyl)
            return box(name, dd, a, z, sd, sa, sz, mat, cyl)
        P(mid, 0.17, 0.85, L, 0.16, 1.6, M_DARK, 'K_Lower')
        for z in (4.7, 5.0):
            o = P(mid, 0.37, z, 0.11, 0.11, L, M_PIPE, 'K_Pipe', True)
            o.rotation_euler = (0, math.pi / 2, 0) if axis == 'y' else (math.pi / 2, 0, 0)
            o.scale = (0.11, 0.11, L)
        P(mid, 0.72, 5.8, L, 0.32, 0.36, M_STEEL, 'K_Beam')
        a = lo + 2.25
        while a < hi:
            if not (skip and skip[0] < a < skip[1]): P(a, 0.72, 2.4, 0.44, 0.44, 4.8, M_BLUE, 'K_Col')
            a += 4.5
    kit('y', 20.52, -1, -24, 24, skip=(-12.5, 12.5))
    kit('x', -23.82, 1, -21, 21)
# corte isometrico: la pared derecha (la mas cercana a la camara) se baja para no tapar el interior
for o in bpy.data.objects:
    if o.name == 'GL_V8_WALL_RIGHT':
        o.scale.z = 0.14; o.location.z = 0.28   # 0.56 m de alto
for o in bpy.data.objects:
    if o.type == 'LIGHT' and not o.name.startswith(('LotFill', 'GC', 'GW')): o.hide_render = True; o.hide_viewport = True   # las luces del garaje original ya estan en su propia imagen

NW, NH = W + left + right, H + top + bottom
orig = cam.data.ortho_scale
cam.data.sensor_fit = 'HORIZONTAL'; cam.data.ortho_scale = orig * NW / W
cam.data.shift_x = ((right - left) / 2) / NW; cam.data.shift_y = ((top - bottom) / 2) / NW
sc.render.resolution_x = NW; sc.render.resolution_y = NH; sc.render.resolution_percentage = pct
sc.render.filepath = f'{OUT}/{name}.png'
bpy.ops.render.render(write_still=True)
a = np.array(Image.open(f'{OUT}/{name}.png').convert('RGBA'))[..., 3] > 8
ys, xs = np.where(a); k = 100 / pct
print('SIZE', NW, NH, 'ALPHA_BBOX', int(xs.min() * k), int(ys.min() * k), int(xs.max() * k), int(ys.max() * k), flush=True)
