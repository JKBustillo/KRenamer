import { useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import type { UnlistenFn } from "@tauri-apps/api/event";

/**
 * Escucha el evento de drag & drop nativo de Tauri sobre la ventana.
 * Expone si hay un arrastre encima (`isHovering`) y entrega las rutas soltadas
 * a `onDrop`. El listener se limpia al desmontar.
 */
export function useFileDrop(onDrop: (paths: string[]) => void) {
  const [isHovering, setIsHovering] = useState(false);

  // Ref para no re-suscribir el listener cada vez que cambia `onDrop`.
  const onDropRef = useRef(onDrop);
  useEffect(() => {
    onDropRef.current = onDrop;
  });

  useEffect(() => {
    let active = true;
    let unlisten: UnlistenFn | undefined;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        const { type } = event.payload;
        if (type === "enter" || type === "over") {
          setIsHovering(true);
        } else if (type === "leave") {
          setIsHovering(false);
        } else if (type === "drop") {
          setIsHovering(false);
          onDropRef.current(event.payload.paths);
        }
      })
      .then((fn) => {
        if (active) unlisten = fn;
        else fn();
      });

    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

  return { isHovering };
}
