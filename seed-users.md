# Usuarios demo

El SQL crea perfiles demo para responsables, pero Supabase Auth no permite crear passwords desde el editor SQL normal.

Para probar login:

1. En Supabase, ir a **Authentication > Users**.
2. Crear un usuario con email y password, por ejemplo `admin@tuagencia.com`.
3. Al crearlo, el trigger `handle_new_user` agrega su perfil en `profiles`.
4. Si queres que sea Admin, editar su fila en `profiles` y cambiar `rol` a `Admin`.

Los perfiles `ana@demo.local`, `bruno@demo.local` y `carla@demo.local` sirven para asignar tareas, aunque no tengan login propio.
