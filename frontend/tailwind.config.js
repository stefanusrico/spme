/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
  	colors: {
  		base: '#03346E',
  		white: '#ffffff',
  		gray: '#e2e8f0',
  		graytxt: '#9ca3af',
  		black: '#000000',
  		red: '#dc4927',
  		green: '#22c55e',
  		blue: '#2763cd',
  		yellow: '#f1c21b',
  		orange: '#f57a00',
  		graybackground: '#f5f6fa',
  		green_badge: '#ccf0ea',
  		red_badge: '#f9d7d3',
  		orange_badge: '#feeddd',
  		blue_badge: '#e0effe'
  	},
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		}
  	},
  	fontFamily: {
  		body: [
  			'Inter',
  			'ui-sans-serif',
  			'system-ui',
  			'-apple-system',
  			'system-ui',
  			'Segoe UI',
  			'Roboto',
  			'Helvetica Neue',
  			'Arial',
  			'Noto Sans',
  			'sans-serif',
  			'Apple Color Emoji',
  			'Segoe UI Emoji',
  			'Segoe UI Symbol',
  			'Noto Color Emoji'
  		],
  		sans: [
  			'Inter',
  			'ui-sans-serif',
  			'system-ui',
  			'-apple-system',
  			'system-ui',
  			'Segoe UI',
  			'Roboto',
  			'Helvetica Neue',
  			'Arial',
  			'Noto Sans',
  			'sans-serif',
  			'Apple Color Emoji',
  			'Segoe UI Emoji',
  			'Segoe UI Symbol',
  			'Noto Color Emoji'
  		]
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
