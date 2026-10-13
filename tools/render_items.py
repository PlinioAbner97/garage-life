# Renderiza los accesorios de la tienda (GL_SHOP_ASSETS_V10) como sprites con la camara del juego, 4 rotaciones cada uno.
# Cada accesorio se centra en el origen (suelo, z=0) y se renderiza con sombra; el ancla de cada PNG es la proyeccion del origen.
#
#   BLEND=new.blend OUT=out [SAMPLES=48 ONLY=SHOP_06_OIL_DRUM] python3 -c "exec(open('tools/render_items.py').read())"
# Salida: OUT/item_<id>_<rot>.png + OUT/items_info.json  (rot 0 mira a -Y, 1 a +X, 2 a +Y, 3 a -X)
import os, math
RL = os.environ.get('RL_PATH', os.path.join(os.getcwd(), 'tools', 'rl.py'))
exec(open(RL).read())
import numpy as np
from PIL import Image

OUT = os.environ.get('OUT', 'out'); os.makedirs(OUT, exist_ok=True)
ONLY = [n for n in os.environ.get('ONLY', '').split(',') if n]
sc = setup(int(os.environ.get('SAMPLES', '48')))
cam = bpy.data.objects['Garage Life Camera']
cam.location = (15.8, -19.8, 14.2); cam.rotation_euler = (1.08877, 0.0, 0.659)
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 25.5; cam.data.sensor_fit = 'AUTO'; cam.data.shift_x = 0; cam.data.shift_y = 0
sc.camera = cam
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'; sc.view_settings.exposure = 0.0
ORIGIN = (932.337, 603.258)   # proyeccion de (0,0,0): coincide con PROJ.origin del juego

# Estilo del garaje original (cartown.blend): materiales y luces iguales para que los accesorios no se vean distintos.
GARAGE_MATS = {   # nombre -> (color, rugosidad, metalico), copiados de los materiales GL_* del garaje del juego
    'GL_Shop_Blue': ((0.01, 0.16, 0.42), 0.25, 0.65), 'GL_Shop_Metal': ((0.2, 0.23, 0.27), 0.22, 0.85),
    'GL_Shop_Dark': ((0.03, 0.04, 0.05), 0.28, 0.75), 'GL_Shop_Red': ((0.48, 0.02, 0.02), 0.25, 0.55),
    'GL_Shop_Green': ((0.95, 0.43, 0.01), 0.32, 0.1), 'GL_Shop_White': ((0.65, 0.68, 0.72), 0.18, 0.7),
    'WOOD': ((0.22, 0.09, 0.03), 0.48, 0.0), 'RUBBER': ((0.01, 0.01, 0.01), 0.78, 0.0),
}
def gmat(key):
    m = bpy.data.materials.get('R_' + key)
    if m: return m
    c, r, mt = GARAGE_MATS[key]; m = bpy.data.materials.new('R_' + key); m.use_nodes = True
    n = [x for x in m.node_tree.nodes if x.bl_idname == 'ShaderNodeBsdfPrincipled'][0]
    n.inputs['Base Color'].default_value = (*c, 1); n.inputs['Roughness'].default_value = r; n.inputs['Metallic'].default_value = mt
    return m
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    for sl in o.material_slots:
        if not sl.material or not sl.material.name.startswith('GL_Shop_'): continue
        k = sl.material.name
        if o.name.startswith('Tire'): k = 'RUBBER'
        elif o.name in ('Bench_Top', 'Table_Top'): k = 'WOOD'
        elif o.name == 'Oil_Drum': k = 'GL_Shop_Dark'
        sl.material = gmat(k)
        if k == 'GL_Shop_Green' and o.name == 'Neon_Light':   # el letrero sigue siendo luminoso
            em = bpy.data.materials.new('R_Neon'); em.use_nodes = True
            n = [x for x in em.node_tree.nodes if x.bl_idname == 'ShaderNodeBsdfPrincipled'][0]
            n.inputs['Base Color'].default_value = (0.05, 0.65, 0.35, 1); n.inputs['Emission Color'].default_value = (0.1, 1, 0.5, 1); n.inputs['Emission Strength'].default_value = 3.0
            sl.material = em
# luces del garaje original (techo, taller, softbox) en lugar de las del .blend nuevo
for o in [o for o in bpy.data.objects if o.type == 'LIGHT']: bpy.data.objects.remove(o)
for nm, e, loc, rot, sx, sy, col in [('A', 1100, (-10, -3, 4), (0.4, 0, -0.4), 5, 1, (1, 0.42, 0.16)), ('F', 1100, (0, -6, 6), (0.8, 0, 0), 10, 5, (0.62, 0.76, 1.0))] + \
        [('C', 900, (x, 0, 6.8), (0, 0, 0), 4, 1, (0.82, 0.9, 1.0)) for x in (-8, -4, 0, 4, 8)] + [('W', 450, (x, 2.2, 5.4), (0, 0, 0), 2.4, 0.4, (0.72, 0.84, 1.0)) for x in (-8, -4, 0, 4, 8)]:
    l = bpy.data.lights.new('L' + nm, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = e; l.color = col
    ob = bpy.data.objects.new('L' + nm, l); ob.location = loc; ob.rotation_euler = rot; bpy.context.scene.collection.objects.link(ob)
sc.world.use_nodes = True
bg = sc.world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.008, 0.012, 0.018, 1); bg.inputs[1].default_value = 0.2
keep_lights = [o for o in bpy.data.objects if o.type == 'LIGHT']
def objs(col): return [o for o in bpy.data.collections[col].all_objects if o]
shop_cols = [c.name for c in bpy.data.collections if c.name.startswith('SHOP_')]
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name != 'Garage Floor':
        o.hide_render = True; o.hide_viewport = True
for o in keep_lights: o.hide_render = False
fl = bpy.data.objects['Garage Floor']; fl.hide_render = False; fl.hide_viewport = False; fl.visible_camera = True; fl.is_shadow_catcher = True

def bbox(ms):
    pts = [o.matrix_world @ Vector(v) for o in ms for v in o.bound_box]
    return Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))), Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))

info = {}
if os.path.exists(f'{OUT}/items_info.json'): info = json.load(open(f'{OUT}/items_info.json'))
for cname in shop_cols:
    if ONLY and cname not in ONLY: continue
    ms = [o for o in objs(cname) if o.type == 'MESH']
    for o in ms: o.hide_render = False; o.hide_viewport = False
    bpy.context.view_layer.update()
    mn, mx = bbox(ms); cx, cy = (mn.x + mx.x) / 2, (mn.y + mx.y) / 2
    wall = cname in ('SHOP_07_NEON_SIGN', 'SHOP_08_TOOL_WALL')
    piv = bpy.data.objects.new('PIV', None); bpy.context.scene.collection.objects.link(piv); piv.location = (cx, cy, 0)
    bpy.context.view_layer.update()
    for o in ms:
        if o.parent is None:
            o.parent = piv; o.matrix_parent_inverse = piv.matrix_world.inverted()
    key = cname[len('SHOP_'):].split('_', 1)[1].lower()   # SHOP_06_OIL_DRUM -> oil_drum
    rots = []
    for rot in range(4):
        piv.rotation_euler = (0, 0, rot * math.pi / 2); piv.location = (0, 0, 0 if wall else -mn.z)
        bpy.context.view_layer.update()
        box = bbox_px(ms, sc, margin=70); box = (box[0], box[1], box[2], min(H, box[3] + 40))
        set_border(sc, box); sc.render.use_crop_to_border = True
        f = f'{OUT}/item_{key}_{rot}.png'; sc.render.filepath = f; bpy.ops.render.render(write_still=True)
        im = Image.open(f); rots.append({'file': os.path.basename(f), 'ax': round(ORIGIN[0] - box[0], 1), 'ay': round(ORIGIN[1] - box[1], 1), 'w': im.width, 'h': im.height})
    info[key] = {'collection': cname, 'size': [round(mx.x - mn.x, 3), round(mx.y - mn.y, 3), round(mx.z - mn.z, 3)], 'wall': wall, 'zmin': round(0 if wall else 0, 3), 'rots': rots}
    json.dump(info, open(f'{OUT}/items_info.json', 'w'), indent=1)
    for o in ms: o.hide_render = True; o.hide_viewport = True
    print('item', key, info[key]['size'], flush=True)
