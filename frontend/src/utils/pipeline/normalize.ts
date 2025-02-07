const normalize = (text: string) => {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
};

export default normalize;
