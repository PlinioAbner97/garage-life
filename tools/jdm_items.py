# Accesorios JDM de decoracion, modelados con primitivas (se ejecuta dentro de render_items.py via EXTRA=tools/jdm_items.py).
# Crea colecciones SHOP_13_*.. que el resto del pipeline renderiza igual que los accesorios de GL_SHOP_ASSETS_V10.
import bpy, math

def mk(name, color, rough=0.4, metal=0.0, emit=None, strength=0.0):
    m = bpy.data.materials.new('J_' + name); m.use_nodes = True
    n = [x for x in m.node_tree.nodes if x.bl_idname == 'ShaderNodeBsdfPrincipled'][0]
    n.inputs['Base Color'].default_value = (*color, 1); n.inputs['Roughness'].default_value = rough; n.inputs['Metallic'].default_value = metal
    if emit: n.inputs['Emission Color'].default_value = (*emit, 1); n.inputs['Emission Strength'].default_value = strength
    return m
M = {
    'steel': mk('steel', (0.2, 0.23, 0.27), 0.22, 0.85), 'dark': mk('dark', (0.03, 0.04, 0.05), 0.28, 0.75), 'rubber': mk('rubber', (0.01, 0.01, 0.01), 0.78),
    'red': mk('red', (0.48, 0.02, 0.02), 0.25, 0.55), 'blue': mk('blue', (0.01, 0.16, 0.42), 0.25, 0.65), 'white': mk('white', (0.8, 0.8, 0.78), 0.55),
    'gold': mk('gold', (0.8, 0.55, 0.12), 0.18, 1.0), 'yellow': mk('yellow', (0.95, 0.43, 0.01), 0.32, 0.1),
    'neon_red': mk('neon_red', (0.6, 0.02, 0.03), 0.3, 0, (1, 0.05, 0.08), 6.0), 'neon_blue': mk('neon_blue', (0.02, 0.2, 0.7), 0.3, 0, (0.1, 0.4, 1), 6.0),
    'lantern': mk('lantern', (0.6, 0.03, 0.02), 0.5, 0, (1, 0.12, 0.05), 2.0), 'sunred': mk('sunred', (0.7, 0.02, 0.04), 0.6),
}
EXTRA_WALL = set()
_cols = {}

def col(name):
    c = bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c); _cols[name] = c; return c

def _put(o, c, mat, name):
    o.name = name
    for k in o.users_collection: k.objects.unlink(o)
    c.objects.link(o); o.data.materials.append(M[mat]); return o

def box(c, name, loc, size, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = size
    return _put(o, c, mat, name)
def cyl(c, name, loc, r, depth, mat, rot=(0, 0, 0), v=24):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=v); o = bpy.context.object
    return _put(o, c, mat, name)
def torus(c, name, loc, major, minor, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=loc, rotation=rot, major_segments=32, minor_segments=12); o = bpy.context.object
    bpy.ops.object.shade_smooth(); return _put(o, c, mat, name)
R90X = (math.pi / 2, 0, 0)

# ---- suelo
c = col('SHOP_13_TIRE_STACK')
for i in range(3): torus(c, 'Tire', (0, 0, 0.1 + i * 0.2), 0.26, 0.1, 'rubber')
cyl(c, 'Rim', (0, 0, 0.62), 0.25, 0.05, 'gold'); cyl(c, 'RimCap', (0, 0, 0.66), 0.07, 0.03, 'steel')
c = col('SHOP_14_PAPER_LANTERN')
cyl(c, 'Base', (0, 0, 0.03), 0.2, 0.06, 'dark'); cyl(c, 'Pole', (0, 0, 0.55), 0.03, 1.0, 'dark')
cyl(c, 'Lantern', (0, 0, 1.2), 0.27, 0.5, 'lantern'); cyl(c, 'CapTop', (0, 0, 1.47), 0.3, 0.06, 'dark'); cyl(c, 'CapBot', (0, 0, 0.93), 0.3, 0.06, 'dark')
c = col('SHOP_15_BUCKET_SEAT')
box(c, 'Frame', (0, 0, 0.12), (0.62, 0.8, 0.07), 'dark'); box(c, 'Leg', (-0.24, -0.3, 0.05), (0.06, 0.06, 0.1), 'steel'); box(c, 'Leg', (0.24, -0.3, 0.05), (0.06, 0.06, 0.1), 'steel')
box(c, 'Leg', (-0.24, 0.3, 0.05), (0.06, 0.06, 0.1), 'steel'); box(c, 'Leg', (0.24, 0.3, 0.05), (0.06, 0.06, 0.1), 'steel')
box(c, 'Cushion', (0, -0.1, 0.27), (0.5, 0.5, 0.2), 'red'); box(c, 'SideL', (-0.27, -0.1, 0.33), (0.1, 0.52, 0.3), 'red'); box(c, 'SideR', (0.27, -0.1, 0.33), (0.1, 0.52, 0.3), 'red')
box(c, 'Back', (0, 0.28, 0.62), (0.5, 0.12, 0.7), 'red', (-0.12, 0, 0)); box(c, 'Head', (0, 0.32, 1.02), (0.3, 0.1, 0.18), 'dark')
c = col('SHOP_16_WING_STAND')
for sx in (-0.55, 0.55): box(c, 'Post', (sx, 0, 0.45), (0.07, 0.07, 0.9), 'dark'); box(c, 'Foot', (sx, 0, 0.03), (0.3, 0.35, 0.06), 'dark'); box(c, 'Plate', (sx + (0.04 if sx > 0 else -0.04), 0, 1.0), (0.04, 0.34, 0.24), 'red')
box(c, 'Wing', (0, 0, 1.0), (1.4, 0.34, 0.04), 'dark', (-0.1, 0, 0)); box(c, 'Flap', (0, 0.2, 1.08), (1.4, 0.1, 0.025), 'steel', (-0.4, 0, 0))
c = col('SHOP_17_TURBO_DISPLAY')
box(c, 'Base', (0, 0, 0.06), (0.8, 0.8, 0.12), 'dark'); cyl(c, 'Column', (0, 0, 0.45), 0.1, 0.65, 'steel')
cyl(c, 'Housing', (0, 0, 1.0), 0.26, 0.28, 'steel', R90X); cyl(c, 'Ring', (0, -0.15, 1.0), 0.27, 0.04, 'blue', R90X)
cyl(c, 'Inlet', (0, -0.3, 1.0), 0.14, 0.26, 'dark', R90X); box(c, 'Outlet', (0.3, 0.05, 1.12), (0.3, 0.18, 0.16), 'steel')
c = col('SHOP_18_TORII')
for sx in (-0.7, 0.7): cyl(c, 'Post', (sx, 0, 0.85), 0.08, 1.7, 'red'); cyl(c, 'Foot', (sx, 0, 0.06), 0.12, 0.12, 'dark')
box(c, 'Nuki', (0, 0, 1.4), (1.5, 0.09, 0.09), 'red'); box(c, 'Kasagi', (0, 0, 1.78), (2.0, 0.15, 0.12), 'red'); box(c, 'Cap', (0, 0, 1.88), (2.1, 0.2, 0.06), 'dark')
# ---- pared (el origen queda en el suelo; z real = altura de colgado)
c = col('SHOP_19_RISING_SUN'); EXTRA_WALL.add('SHOP_19_RISING_SUN')
box(c, 'Cloth', (0, 0, 2.0), (1.6, 0.03, 1.0), 'white'); cyl(c, 'Sun', (0, -0.02, 2.0), 0.3, 0.02, 'sunred', R90X, 32)
box(c, 'RodTop', (0, 0, 2.52), (1.7, 0.06, 0.05), 'dark'); box(c, 'RodBot', (0, 0, 1.48), (1.7, 0.06, 0.05), 'dark')
c = col('SHOP_20_STEERING_WHEEL'); EXTRA_WALL.add('SHOP_20_STEERING_WHEEL')
torus(c, 'Ring', (0, -0.05, 2.0), 0.28, 0.035, 'dark', R90X)
for a in (0, 2.1, -2.1): box(c, 'Spoke', (0.14 * math.sin(a), -0.05, 2.0 + 0.14 * math.cos(a)), (0.04, 0.03, 0.28), 'steel', (0, -a, 0))
cyl(c, 'Hub', (0, -0.06, 2.0), 0.07, 0.05, 'red', R90X); box(c, 'Mount', (0, 0.0, 2.0), (0.12, 0.04, 0.12), 'dark')
c = col('SHOP_21_PLATE_RACK'); EXTRA_WALL.add('SHOP_21_PLATE_RACK')
box(c, 'Board', (0, 0, 2.0), (1.5, 0.04, 0.62), 'dark')
for i, (px, m) in enumerate(((-0.48, 'white'), (0, 'yellow'), (0.48, 'white'))): box(c, 'Plate', (px, -0.035, 2.0), (0.42, 0.025, 0.2), m)
c = col('SHOP_22_NEON_BAR'); EXTRA_WALL.add('SHOP_22_NEON_BAR')
box(c, 'Back', (0, 0, 2.1), (2.1, 0.04, 0.34), 'dark'); box(c, 'Red', (0, -0.05, 2.18), (1.9, 0.045, 0.06), 'neon_red'); box(c, 'Blue', (0, -0.05, 2.02), (1.9, 0.045, 0.06), 'neon_blue')
