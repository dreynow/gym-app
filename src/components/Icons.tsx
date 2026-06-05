import type { SVGProps } from 'react'

/**
 * Inline stroke icons (feather-style) so we ship no icon-library dependency.
 * All inherit `currentColor` and a 24x24 viewBox.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 24, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconDumbbell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 6.5l11 11" />
    <path d="M21 21l-1-1" />
    <path d="M3 3l1 1" />
    <rect x="1.5" y="13.5" width="4" height="7" rx="1" transform="rotate(-45 3.5 17)" />
    <rect x="18.5" y="3.5" width="4" height="7" rx="1" transform="rotate(-45 20.5 7)" />
  </Svg>
)

export const IconHistory = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l3 2" />
  </Svg>
)

export const IconChart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3v18h18" />
    <path d="M7 14l3-4 3 3 4-6" />
  </Svg>
)

export const IconBody = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="5" r="2.5" />
    <path d="M12 8v6" />
    <path d="M7 11h10" />
    <path d="M12 14l-3 7" />
    <path d="M12 14l3 7" />
  </Svg>
)

export const IconLibrary = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </Svg>
)

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
)

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Svg>
)

export const IconMinus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
)

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 6L9 17l-5-5" />
  </Svg>
)

export const IconX = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </Svg>
)

export const IconTimer = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2 2" />
    <path d="M9 2h6" />
  </Svg>
)

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
  </Svg>
)

export const IconEdit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Svg>
)

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Svg>
)

export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 4l14 8-14 8V4z" />
  </Svg>
)

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 18l6-6-6-6" />
  </Svg>
)

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 18l-6-6 6-6" />
  </Svg>
)

export const IconBack = IconChevronLeft

export const IconTrophy = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 4h12v3a6 6 0 0 1-12 0V4z" />
    <path d="M6 6H3v1a3 3 0 0 0 3 3" />
    <path d="M18 6h3v1a3 3 0 0 1-3 3" />
    <path d="M9 16h6" />
    <path d="M12 13v3" />
    <path d="M8 20h8" />
  </Svg>
)

export const IconCalculator = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 7h6" />
    <path d="M9 11h.01M12 11h.01M15 11h.01" />
    <path d="M9 15h.01M12 15h.01M15 15h.01" />
  </Svg>
)

export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <path d="M4 21h16" />
  </Svg>
)

export const IconUpload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21V9" />
    <path d="M7 14l5-5 5 5" />
    <path d="M4 3h16" />
  </Svg>
)

export const IconMore = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
  </Svg>
)

export const IconNote = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4h16v12l-4 4H4z" />
    <path d="M16 20v-4h4" />
  </Svg>
)
