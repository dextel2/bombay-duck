import { createChecksum } from './checksum';

describe('createChecksum', () => {
  it('should generate a SHA-256 checksum', () => {
    const values = ['hello', 'world'];
    const checksum = createChecksum(values);
    
    expect(checksum).toBeDefined();
    expect(typeof checksum).toBe('string');
    expect(checksum.length).toBe(64); // SHA-256 produces 64-character hex string
  });

  it('should handle single value', () => {
    const values = ['single'];
    const checksum = createChecksum(values);
    
    expect(checksum).toBeDefined();
    expect(typeof checksum).toBe('string');
    expect(checksum.length).toBe(64);
  });

  it('should handle empty array', () => {
    const values: string[] = [];
    const checksum = createChecksum(values);
    
    // Empty array should produce consistent checksum
    expect(checksum).toBeDefined();
    expect(typeof checksum).toBe('string');
    expect(checksum.length).toBe(64);
  });

  it('should trim whitespace from values', () => {
    const valuesWithSpaces = [' hello ', ' world '];
    const valuesWithoutSpaces = ['hello', 'world'];
    
    const checksumWithSpaces = createChecksum(valuesWithSpaces);
    const checksumWithoutSpaces = createChecksum(valuesWithoutSpaces);
    
    expect(checksumWithSpaces).toBe(checksumWithoutSpaces);
  });

  it('should filter out empty strings', () => {
    const valuesWithEmpty = ['hello', '', 'world'];
    const valuesWithoutEmpty = ['hello', 'world'];
    
    const checksumWithEmpty = createChecksum(valuesWithEmpty);
    const checksumWithoutEmpty = createChecksum(valuesWithoutEmpty);
    
    expect(checksumWithEmpty).toBe(checksumWithoutEmpty);
  });

  it('should filter out whitespace-only strings', () => {
    const valuesWithWhitespaceOnly = ['hello', '   ', 'world'];
    const valuesWithoutWhitespaceOnly = ['hello', 'world'];
    
    const checksumWithWhitespaceOnly = createChecksum(valuesWithWhitespaceOnly);
    const checksumWithoutWhitespaceOnly = createChecksum(valuesWithoutWhitespaceOnly);
    
    expect(checksumWithWhitespaceOnly).toBe(checksumWithoutWhitespaceOnly);
  });

  it('should produce consistent checksum regardless of input order', () => {
    const values1 = ['first', 'second', 'third'];
    const values2 = ['third', 'first', 'second'];
    const values3 = ['second', 'third', 'first'];
    
    const checksum1 = createChecksum(values1);
    const checksum2 = createChecksum(values2);
    const checksum3 = createChecksum(values3);
    
    expect(checksum1).toBe(checksum2);
    expect(checksum2).toBe(checksum3);
    expect(checksum1).toBe(checksum3);
  });

  it('should produce different checksums for different values', () => {
    const values1 = ['hello', 'world'];
    const values2 = ['goodbye', 'world'];
    const values3 = ['hello', 'jests'];
    
    const checksum1 = createChecksum(values1);
    const checksum2 = createChecksum(values2);
    const checksum3 = createChecksum(values3);
    
    expect(checksum1).not.toBe(checksum2);
    expect(checksum1).not.toBe(checksum3);
    expect(checksum2).not.toBe(checksum3);
  });

  it('should handle duplicate values consistently', () => {
    const values = ['hello', 'world', 'hello'];
    const checksum = createChecksum(values);
    
    // Duplicates will be preserved since sort will place them together
    expect(checksum).toBeDefined();
    expect(typeof checksum).toBe('string');
    expect(checksum.length).toBe(64);
  });

  it('should handle unicode characters', () => {
    const values = ['café', '北京', '🎉'];
    const checksum = createChecksum(values);
    
    expect(checksum).toBeDefined();
    expect(typeof checksum).toBe('string');
    expect(checksum.length).toBe(64);
  });

  it('should handle special characters', () => {
    const values = ['hello@world.com', 'special!@#$%^&*()', 'newline\nchar'];
    const checksum = createChecksum(values);
    
    expect(checksum).toBeDefined();
    expect(typeof checksum).toBe('string');
    expect(checksum.length).toBe(64);
  });

  it('should be deterministic - same inputs give same outputs', () => {
    const values = ['test', 'data', 'for', 'consistency'];
    
    const checksum1 = createChecksum(values);
    const checksum2 = createChecksum(values);
    const checksum3 = createChecksum([...values]); // Copy of the same array
    
    expect(checksum1).toBe(checksum2);
    expect(checksum2).toBe(checksum3);
    expect(checksum1).toBe(checksum3);
  });
});