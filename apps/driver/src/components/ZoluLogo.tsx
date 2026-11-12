import { Image } from 'react-native';

import zoluLogo from '../../assets/icon.png';

interface Props {
  size?: number;
}

export function ZoluLogo({ size = 36 }: Props) {
  return (
    <Image
      accessibilityLabel="ZoluRide logo"
      fadeDuration={0}
      resizeMode="contain"
      resizeMethod="resize"
      source={zoluLogo}
      style={{ width: size, height: size, borderRadius: size * 0.18, backgroundColor: '#F5EFE2' }}
    />
  );
}