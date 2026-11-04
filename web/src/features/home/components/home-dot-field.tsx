/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useTheme } from '@/context/theme-provider'
import { cn } from '@/lib/utils'

import DotField from './dot-field'

import './home-dot-field.css'

/** Decorative background: global passive pointer tracking preserves page controls. */
export function HomeDotField(props: { fullPage?: boolean }) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  return (
    <div
      className={cn('home-dot-field', props.fullPage && 'home-dot-field-page')}
      aria-hidden='true'
    >
      <DotField
        dotRadius={2}
        dotSpacing={24}
        gradientFrom={dark ? '#648dca' : '#87aadd'}
        gradientTo={dark ? '#93bcea' : '#bfd5ef'}
        glowColor={dark ? '#8ab4ee' : '#4d82cd'}
        baseOpacity={dark ? 0.38 : 0.34}
        glowIntensity={0.35}
        cursorRadius={260}
        bulgeStrength={0.45}
        twist={12}
        waveAmplitude={4}
        speed={0.35}
        holdToZoom={false}
        lightMode={!dark}
        maxDevicePixelRatio={1.5}
      />
    </div>
  )
}
