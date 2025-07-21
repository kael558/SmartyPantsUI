import { Vibrant } from "node-vibrant/node";
import tinycolor from 'tinycolor2';

export async function generateColorSchemes(imageBuffer) {
	try {
		// Extract color palette from image
		const palette = await Vibrant.from(imageBuffer).getPalette();

		// Extract main colors
		const primaryColor = palette.Vibrant?.hex || '#6366f1';
		const secondaryColor = palette.LightVibrant?.hex || '#818cf8';
		const tertiaryColor = palette.DarkVibrant?.hex || '#4f46e5';
		const backgroundColor = palette.Muted?.hex || '#ffffff';

		// Generate different schemes
		const schemes = [
			{
				"name": "Default",
				"scheme": generateDefaultScheme(primaryColor, secondaryColor, tertiaryColor, backgroundColor)

			},
			{
				"name": "Complementary",
				"scheme": generateComplementaryScheme(primaryColor)
			},
			{
				"name": "Analogous",
				"scheme": generateAnalogousScheme(primaryColor)
			},
			{
				"name": "Triadic",
				"scheme": generateTriadicScheme(primaryColor)
			},
			{
				"name": "Monochromatic",
				"scheme": generateMonochromaticScheme(primaryColor)
			}
		];

		// Score and sort schemes
		const scoredSchemes = schemes
			.map(scheme => ({
				scheme,
				score: scoreColorScheme(scheme.scheme)
			}))
			.sort((a, b) => b.score - a.score)
			.map(item => item.scheme);

		return scoredSchemes;

	} catch (error) {
		console.error('Error generating color schemes:', error);
		return [getDefaultColorScheme()]; // Fallback to default scheme
	}
}

function generateDefaultScheme(primary, secondary, tertiary, background) {
	return {
		primaryColor: ensureDark(primary),
		secondaryColor: ensureDark(secondary),
		tertiaryColor: ensureDark(tertiary),
		backgroundColor: ensureLight(background)
	};
}



function scoreColorScheme(scheme) {
	let score = 0;

	// Check contrast ratios
	score += tinycolor.readability(scheme.primaryColor, scheme.backgroundColor) * 2;
	score += tinycolor.readability(scheme.secondaryColor, scheme.backgroundColor) * 2;
	score += tinycolor.readability(scheme.tertiaryColor, scheme.backgroundColor) * 2;

	// Check color harmony
	const mainColors = [scheme.primaryColor, scheme.secondaryColor, scheme.tertiaryColor];
	const colorHarmony = evaluateColorHarmony(mainColors);
	score += colorHarmony * 5;

	return score;
}

function evaluateColorHarmony(colors) {
	let score = 0;

	// Check if colors are too similar
	for (let i = 0; i < colors.length; i++) {
		for (let j = i + 1; j < colors.length; j++) {
			const difference = tinycolor.readability(colors[i], colors[j]);
			score += difference;
		}
	}

	return score / colors.length;
}
function generateComplementaryScheme(baseColor) {
	const color = tinycolor(baseColor);
	const complement = color.complement();

	return {
		primaryColor: ensureDark(color.toHexString()),
		secondaryColor: ensureDark(color.darken(10).toHexString()),
		tertiaryColor: ensureDark(complement.toHexString()),
		backgroundColor: '#ffffff'
	};
}

function generateAnalogousScheme(baseColor) {
	const color = tinycolor(baseColor);
	const analogous = color.analogous();

	return {
		primaryColor: ensureDark(analogous[0].toHexString()),
		secondaryColor: ensureDark(analogous[1].toHexString()),
		tertiaryColor: ensureDark(analogous[2].toHexString()),
		backgroundColor: '#ffffff'
	};
}

function generateTriadicScheme(baseColor) {
	const color = tinycolor(baseColor);
	const triadic = color.triad();

	return {
		primaryColor: ensureDark(triadic[0].toHexString()),
		secondaryColor: ensureDark(triadic[1].toHexString()),
		tertiaryColor: ensureDark(triadic[2].toHexString()),
		backgroundColor: '#ffffff'
	};
}

function generateMonochromaticScheme(baseColor) {
	const color = tinycolor(baseColor);
	const monochromatic = color.monochromatic();

	return {
		primaryColor: ensureDark(monochromatic[0].toHexString()),
		secondaryColor: ensureDark(monochromatic[2].toHexString()),
		tertiaryColor: ensureDark(monochromatic[4].toHexString()),
		backgroundColor: '#ffffff'
	};
}

function ensureDark(color) {
	const c = tinycolor(color);
	return c.isDark() ? c.toHexString() : c.darken(20).toHexString();
}

function ensureLight(color) {
	const c = tinycolor(color);
	return c.isLight() ? c.toHexString() : c.lighten(20).toHexString();
}

function getDefaultColorScheme() {
	return {
		primaryColor: '#6366f1',
		secondaryColor: '#818cf8',
		tertiaryColor: '#4f46e5',
		backgroundColor: '#ffffff'
	};
}

function getContrastRatio(
	color1,
	color2
) {
	// Convert colors to relative luminance
	const getLuminance = (r, g, b) => {
		let [rs, gs, bs] = [r / 255, g / 255, b / 255].map((val) => {
			return val <= 0.03928
				? val / 12.92
				: Math.pow((val + 0.055) / 1.055, 2.4);
		});
		return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
	};

	const l1 = getLuminance(color1.r, color1.g, color1.b);
	const l2 = getLuminance(color2.r, color2.g, color2.b);

	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);

	return (lighter + 0.05) / (darker + 0.05);
}

export function getContrastTextColor(bgColor) {
	// Convert bgColor to RGB values as before...
	const r = parseInt(bgColor.substring(1, 3), 16);
	const g = parseInt(bgColor.substring(3, 5), 16);
	const b = parseInt(bgColor.substring(5, 7), 16);

	const black = { r: 0, g: 0, b: 0 };
	const white = { r: 255, g: 255, b: 255 };
	const bg = { r, g, b };

	const blackRatio = getContrastRatio(bg, black);
	const whiteRatio = getContrastRatio(bg, white);

	return whiteRatio > blackRatio ? "#FFFFFF" : "#000000";
}

export function getContrastTextColorShaded(bgColor) {
	// Convert bgColor to RGB values
	const r = parseInt(bgColor.substring(1, 3), 16);
	const g = parseInt(bgColor.substring(3, 5), 16);
	const b = parseInt(bgColor.substring(5, 7), 16);

	const black = { r: 0, g: 0, b: 0 };
	const white = { r: 255, g: 255, b: 255 };
	const bg = { r, g, b };

	const blackRatio = getContrastRatio(bg, black);
	const whiteRatio = getContrastRatio(bg, white);

	// Dark grey or light grey with transparency
	return whiteRatio > blackRatio ? "rgba(220, 220, 220, 0.8)" : "rgba(84, 84, 84, 0.8)";
}

/*
async function example() {
	// Your base64 image string
	const base64Image = "data:image/png;base64,"; // Your base64 string here

	try {
		const colorSchemes = await generateColorSchemes(base64Image);

		console.log('Generated Color Schemes:');
		colorSche*/