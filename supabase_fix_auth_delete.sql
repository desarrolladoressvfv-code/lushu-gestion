-- ══════════════════════════════════════════════════════
-- Fix: Eliminar usuario de Auth cuando se elimina de la tabla usuarios
-- Esto permite volver a registrar el mismo email después de eliminarlo
-- ══════════════════════════════════════════════════════

-- 1. Función que borra el usuario de auth.users al borrar de la tabla usuarios
CREATE OR REPLACE FUNCTION public.eliminar_auth_usuario()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.auth_user_id;
  RETURN OLD;
END;
$$;

-- 2. Trigger que llama a la función antes de cada DELETE en la tabla usuarios
DROP TRIGGER IF EXISTS on_usuario_eliminado ON public.usuarios;
CREATE TRIGGER on_usuario_eliminado
  BEFORE DELETE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.eliminar_auth_usuario();

-- ══════════════════════════════════════════════════════
-- Fix inmediato: el usuario flp.avc98@gmail.com ya existe en Auth
-- Ejecuta esto para eliminarlo y poder volver a crearlo:
-- ══════════════════════════════════════════════════════
-- Primero busca el ID del usuario en Auth:
-- SELECT id FROM auth.users WHERE email = 'flp.avc98@gmail.com';
-- Luego bórralo con ese ID:
-- DELETE FROM auth.users WHERE email = 'flp.avc98@gmail.com';
