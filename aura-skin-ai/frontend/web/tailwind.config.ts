import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			surface: {
  				DEFAULT: 'hsl(var(--surface))',
  				foreground: 'hsl(var(--surface-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			glass: {
  				'1': 'var(--glass-1)',
  				'2': 'var(--glass-2)',
  				'3': 'var(--glass-3)',
  				'4': 'var(--glass-4)'
  			}
  		},
  		fontFamily: {
  			brand: [
  				'var(--font-brand)',
  				'cursive'
  			],
  			heading: [
  				'var(--font-brand)',
  				'cursive'
  			],
  			accent: [
  				'var(--font-brand)',
  				'cursive'
  			],
  			body: [
  				'var(--font-brand)',
  				'cursive'
  			],
  			label: [
  				'var(--font-brand)',
  				'cursive'
  			]
  		},
  		backdropBlur: {
  			glass: '20px'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			shimmer: {
  				'0%': { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			shimmer: 'shimmer 1.2s ease-in-out infinite'
  		},
  		backgroundSize: {
  			'shimmer': '200% 100%'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
