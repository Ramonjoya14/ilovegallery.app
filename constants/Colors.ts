const tintColor = '#FF6B00';
const background = '#120D0A'; // Fondo café muy oscuro
const cardBg = '#1E1915'; // Fondo de tarjetas
const secondaryText = '#8E8E93';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColor,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColor,
  },
  dark: {
    text: '#FFFFFF',
    background: background,
    tint: tintColor,
    tabIconDefault: '#48484A',
    tabIconSelected: tintColor,
    card: cardBg,
    secondaryText: secondaryText,
    accent: tintColor,
  },
};

