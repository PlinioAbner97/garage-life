# Renderiza sprites (beauty + mascara) de los autos nuevos (Supra, R34, Evo) dentro del garaje original.
# Misma tecnica que render_sprites.py: mascara R = pintura, G = rines; beauty con sombra recuperada.
#
# Uso (desde un directorio fuera de tools/):
#   BLEND=cartown.blend1 SUPRA_FILE=GarageLife_Supra_R34.blend EVO_FILE=GarageLife_Evo8.blend \
#   OUT=out KEYS=sup,r34,evo python3 -c "exec(open('tools/render_new_cars.py').read())"
# MASKONLY=1 renderiza solo la mascara (rapido) para revisar la asignacion de materiales.
import os, math
RL = os.environ.get('RL_PATH', os.path.join(os.getcwd(), 'tools', 'rl.py'))
exec(open(RL).read())
import numpy as np
from PIL import Image

OUT = os.environ.get('OUT', 'out'); os.makedirs(OUT, exist_ok=True)
SUPRA_FILE = os.environ['SUPRA_FILE']; EVO_FILE = os.environ['EVO_FILE']
STUDIO = {'Plane.108', 'Plane.051', 'Plane.044', 'Plane.052', 'Plane.144', 'Plane.054', 'Plane.146'}

# length: calibrado para que el area en pantalla (mascara) iguale al Eclipse. slot_x: SLOT_WORLD de src/data/config.ts (slots 3,4,5). rotz: la nariz debe apuntar a -Y.
CARS = {
    'sup': dict(file=SUPRA_FILE, coll='SUPRA_MK4_CAR', slot=(0, 0), rotz=math.pi / 2, length=5.60,
                paint=['GL_Supra_Paint_Upper', 'GL_Supra_Paint_Lower', 'GL_Supra_Paint_Secondary'],
                rim=os.environ.get('SUP_RIM', 'metal.001,Material.059').split(','), skip=[]),
    'r34': dict(file=SUPRA_FILE, coll='SKYLINE_R34_CAR', slot=(4, 0), rotz=0.0, length=5.66,
                paint=['Car Paint.004', 'Car Paint.005'], rim=['Rim.003'], skip=['Ground'], dedupe=True),
    'evo': dict(file=EVO_FILE, coll='EVO8_CAR', slot=(8, 0), rotz=0.0, length=5.48,
                paint=['car_paint'], rim=['Metal'], skip=['Plane.081', 'Plane.078', 'Plane.079']),
}

def world_bbox(objs):
    pts = [o.matrix_world @ Vector(v) for o in objs if o.type == 'MESH' for v in o.bound_box]
    return (Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))),
            Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))))

def old_cars():
    s = set()
    for cn in ('ECLIPSE_CAR', 'SUBARU_22B_CAR'):
        for o in bpy.data.collections[cn].all_objects:
            s.add(o); s |= set(o.children_recursive)
    return s

def dedupe_lods(keep):
    """El modelo R34 trae 3 copias apiladas de cada pieza (alta resolucion, low-poly con modificadores,
    caja sin materiales). Agrupa por bbox evaluado y deja la mejor copia de cada grupo."""
    dg = bpy.context.evaluated_depsgraph_get(); groups = {}
    for o in keep:
        eo = o.evaluated_get(dg)
        pts = [o.matrix_world @ Vector(v) for v in eo.bound_box]
        k = tuple(round(v / 0.02) for p in (Vector(map(min, zip(*pts))), Vector(map(max, zip(*pts)))) for v in p)
        groups.setdefault(k, []).append(o)
    drop = set()
    for g in groups.values():
        if len(g) < 2: continue
        g.sort(key=lambda o: (len(o.modifiers) == 0, len(o.material_slots), len(o.data.vertices)), reverse=True)
        drop |= set(g[1:])
    return drop

def add_car(key):
    """Abre el garaje (ya hecho por setup), importa el auto, lo escala, gira y coloca en su slot."""
    c = CARS[key]
    with bpy.data.libraries.load(c['file'], link=False) as (src, dst):
        dst.collections = [c['coll']]
        dst.materials = [n for n in c['paint'] + c['rim'] if n in src.materials]
        dst.objects = [n for n in c['skip'] if n in src.objects]
    col = dst.collections[0]
    bpy.context.scene.collection.children.link(col)
    skip = set(dst.objects)
    objs = set(col.all_objects)
    for o in list(objs): objs |= set(o.children_recursive)
    keep = {o for o in objs if o.type == 'MESH' and o not in skip}
    if c.get('dedupe'):
        drop = dedupe_lods(keep); print(key, 'LODs descartados:', len(drop), flush=True)
        keep -= drop; skip |= drop
    root = bpy.data.objects.new('NEWCAR_ROOT', None); bpy.context.scene.collection.objects.link(root)
    for o in objs:
        if o.parent is None and o is not root:
            o.parent = root
    bpy.context.view_layer.update()
    root.rotation_euler.z = c['rotz']; bpy.context.view_layer.update()
    mn, mx = world_bbox(keep); L = max(mx.x - mn.x, mx.y - mn.y)
    s = c['length'] / L; root.scale = (s, s, s); bpy.context.view_layer.update()
    mn, mx = world_bbox(keep)
    floor = bpy.data.objects['Garage Floor']
    fz = max((floor.matrix_world @ Vector(v)).z for v in floor.bound_box)
    root.location = Vector((c['slot'][0] - (mn.x + mx.x) / 2, c['slot'][1] - (mn.y + mx.y) / 2, fz - mn.z))
    bpy.context.view_layer.update()
    mn, mx = world_bbox(keep)
    print(key, 'scale', round(s, 3), 'bbox', [round(v, 2) for v in mn], [round(v, 2) for v in mx], flush=True)
    return keep, skip, objs, set(dst.materials[:len(c['paint'])]), set(dst.materials[len(c['paint']):]), (c['slot'][0], c['slot'][1], fz)

def isolate_new(keep, skip, objs):
    olds = old_cars()
    for o in bpy.data.objects:
        if o.type != 'MESH': continue
        if o in keep:
            pass  # respeta hide_render del archivo original (rejillas ocultas, etc.)
        elif o in skip or (o in olds and o.name not in STUDIO):
            o.hide_render = True
        else:
            o.hide_render = False; o.visible_camera = False
    fl = bpy.data.objects['Garage Floor']; return fl

def black_for_empty(keep):
    blk = bpy.data.materials.new('MASK_BLACK'); blk.use_nodes = True
    for o in keep:
        if not o.material_slots: o.data.materials.append(blk)
        for sl in o.material_slots:
            if sl.material is None: sl.material = blk

def rewire_mask(paint_m, rim_m):
    for m in bpy.data.materials:
        if m.is_grease_pencil: continue
        if m.node_tree is None: m.use_nodes = True   # materiales sin nodos renderizaban blanco
        if m.node_tree is None: continue
        col = (1, 0, 0, 1) if m in paint_m else (0, 1, 0, 1) if m in rim_m else (0, 0, 0, 1)
        nt = m.node_tree
        outs = [n for n in nt.nodes if n.bl_idname == 'ShaderNodeOutputMaterial']
        if not outs: outs = [nt.nodes.new('ShaderNodeOutputMaterial')]
        for out in outs:
            for k in ('Surface', 'Volume', 'Displacement'):
                for l in list(out.inputs[k].links): nt.links.remove(l)
            e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = col; e.inputs['Strength'].default_value = 1
            nt.links.new(e.outputs[0], out.inputs['Surface'])

def render(path):
    bpy.context.scene.render.filepath = path; bpy.ops.render.render(write_still=True)

info_path = f'{OUT}/info_new.json'
info = json.load(open(info_path)) if os.path.exists(info_path) else {}
for key in os.environ.get('KEYS', 'sup,r34,evo').split(','):
    # --- pasada de mascara (frame completo)
    sc = setup(2); sc.cycles.use_denoising = False
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    keep, skip, objs, pm, rm, anchor = add_car(key)
    isolate_new(keep, skip, objs)
    black_for_empty(keep)
    rewire_mask(pm, rm)
    render(f'{OUT}/{key}_mask_full.png')
    im = np.array(Image.open(f'{OUT}/{key}_mask_full.png'))
    ys, xs = np.where(im[..., 3] > 8); m = 70
    box = (max(0, xs.min() - m), max(0, ys.min() - m), min(W, xs.max() + m), min(H, ys.max() + m + 10))
    print(key, 'box', box, flush=True)
    Image.open(f'{OUT}/{key}_mask_full.png').crop(box).save(f'{OUT}/{key}_mask.png')
    if os.environ.get('MASKONLY'): continue
    # --- beauty (A: auto + garaje, B: solo garaje) para recuperar la sombra
    sc = setup(int(os.environ.get('SAMPLES', '96')))
    keep, skip, objs, pm, rm, anchor = add_car(key)
    fl = isolate_new(keep, skip, objs); fl.visible_camera = True; fl.is_shadow_catcher = True
    set_border(sc, box); sc.render.use_crop_to_border = False
    render(f'{OUT}/{key}_A_full.png')
    for o in keep: o.hide_render = True
    render(f'{OUT}/{key}_B_full.png')
    A = np.array(Image.open(f'{OUT}/{key}_A_full.png').crop(box)).astype(np.float32) / 255
    B = np.array(Image.open(f'{OUT}/{key}_B_full.png').crop(box)).astype(np.float32) / 255
    M = np.array(Image.open(f'{OUT}/{key}_mask.png')).astype(np.float32) / 255
    carA = M[..., 3]
    s_corr = np.clip((A[..., 3] - B[..., 3]) / np.maximum(1 - B[..., 3], 1e-3), 0, 1)
    s_corr = np.where(s_corr < 0.03, 0, s_corr)
    outA = carA + (1 - carA) * s_corr
    rgb = np.where((carA > 0.02)[..., None], A[..., :3], 0)
    res = np.dstack([rgb, outA])
    Image.fromarray((np.clip(res, 0, 1) * 255).astype(np.uint8), 'RGBA').save(f'{OUT}/{key}_beauty.png')
    info[key] = {'box': [int(v) for v in box], 'anchorWorld': [float(v) for v in anchor]}
    json.dump(info, open(info_path, 'w'), indent=1)
    print('done', key, flush=True)
