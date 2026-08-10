/**
 * Stroke icons for quick-copy actions (envelope, phone, map pin, etc.).
 * No emoji — consistent with common UI icon sets.
 */

function baseSvgProps(size, color, className) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": true,
  };
}

export function QuickCopyIcon({ fieldKey, size = 20, color = "currentColor", className }) {
  const p = baseSvgProps(size, color, className);

  switch (fieldKey) {
    case "email":
      return (
        <svg {...p}>
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    case "phone":
      return (
        <svg {...p}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      );
    case "location":
      return (
        <svg {...p}>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "postalCode":
      return (
        <svg {...p}>
          <line x1="4" x2="20" y1="9" y2="9" />
          <line x1="4" x2="20" y1="15" y2="15" />
          <line x1="10" x2="8" y1="3" y2="21" />
          <line x1="16" x2="14" y1="3" y2="21" />
        </svg>
      );
    case "lastCompany":
      return (
        <svg {...p}>
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
          <path d="M6 12h12" />
          <path d="M6 16h12" />
          <path d="M6 8h12" />
          <path d="M10 6h4" />
        </svg>
      );
    case "lastRole":
      return (
        <svg {...p}>
          <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...p}>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect width="4" height="12" x="2" y="9" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
    case "github":
      return (
        <svg {...p}>
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.22c3 .33 5.5-1.41 5.5-4.86a4.5 4.5 0 0 0-.86-3.17 4.48 4.48 0 0 0 .34-3.47s-.72-2.26-2.57-.77a9.36 9.36 0 0 0-4.93 0C9.21 1.76 8.5 4 8.5 4a4.48 4.48 0 0 0 .34 3.47 4.5 4.5 0 0 0-.86 3.17c0 3.45 2.5 5.19 5.5 4.86a4.8 4.8 0 0 0-1 3.22v4" />
          <path d="M9 18c-4.51 2-4.51-2-6-2" />
        </svg>
      );
    default:
      return null;
  }
}
