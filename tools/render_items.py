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

# Los materiales GL_Shop_* solo traen color de viewport: se les da un Principled BSDF con ese color (neon = emision).
for m in bpy.data.materials:
    if not m.name.startswith('GL_Shop_'): continue
    m.use_nodes = True
    n = [x for x in m.node_tree.nodes if x.bl_idname == 'ShaderNodeBsdfPrincipled'][0]
    n.inputs['Base Color'].default_value = tuple(m.diffuse_color)
    metal = m.name.endswith('Metal'); n.inputs['Metallic'].default_value = 0.6 if metal else 0.0; n.inputs['Roughness'].default_value = 0.35 if metal else 0.55
    if m.name.endswith('Green') or m.name.endswith('White'):
        n.inputs['Emission Color'].default_value = tuple(m.diffuse_color); n.inputs['Emission Strength'].default_value = 1.2 if m.name.endswith('Green') else 0.4

def objs(col): return [o for o in bpy.data.collections[col].all_objects if o]
shop_cols = [c.name for c in bpy.data.collections if c.name.startswith('SHOP_')]
keep_lights = [o for o in bpy.data.objects if o.type == 'LIGHT']
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
