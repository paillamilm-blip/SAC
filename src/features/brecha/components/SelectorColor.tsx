// Elegir el color del Gemelo desde el perfil. Vive aparte porque ColorPicker arrastra animaciones y audio:
// el perfil lo carga solo cuando se abre (React.lazy), y el resto de la app no paga ese peso.

import { COLOR_OPTIONS, ColorPicker, getUserColor } from '@/shared/components/ColorPicker';

export default function SelectorColor() {
  const actual = COLOR_OPTIONS.find((c) => c.hex === getUserColor())?.id;
  return (
    <ColorPicker
      selected={actual}
      dotSize={44}
      onSelect={() => {
        // useUserColor escucha este evento: el acento de toda la app cambia al instante.
        window.dispatchEvent(new Event('omicron:color-changed'));
      }}
    />
  );
}
