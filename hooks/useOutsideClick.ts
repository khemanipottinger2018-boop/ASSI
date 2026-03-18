import { RefObject, useEffect } from 'react';

export function useOutsideClick(
  refs: RefObject<HTMLElement | null>[],
  onOutside: () => void
) {
  useEffect(() => {
    function handle(e: MouseEvent) {
      const target = e.target as Node;

      const clickedInside = refs.some(
        (ref) => ref.current && ref.current.contains(target)
      );

      if (!clickedInside) {
        onOutside();
      }
    }

    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [refs, onOutside]);
}
