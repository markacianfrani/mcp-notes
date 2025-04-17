import { validateTag } from './tag-validator.js';

// Test valid tags
console.log('Testing valid tags:');
const validTags = [
  'tag',
  'tag123',
  'tag_123',
  'tag-123',
  'tag/subtag',
  'camelCaseTag',
  'PascalCaseTag',
  'snake_case_tag',
  'kebab-case-tag',
  'nested/tag/structure',
  'a', // Single letter
  '_', // Just underscore
  '-', // Just hyphen
  '/', // Just slash
  'a1', // Letter and number
  '_1', // Underscore and number
  '-1', // Hyphen and number
  '/1', // Slash and number
];

validTags.forEach(tag => {
  const result = validateTag(tag);
  console.log(`${tag}: ${result.isValid ? 'Valid ✓' : `Invalid ✗ - ${result.error}`}`);
});

// Test invalid tags
console.log('\nTesting invalid tags:');
const invalidTags = [
  '123', // Only numbers
  '1234', // Only numbers
  'tag with spaces', // Contains spaces
  'tag@symbol', // Contains invalid symbol
  'tag#symbol', // Contains invalid symbol
  'tag.symbol', // Contains invalid symbol
  'tag!symbol', // Contains invalid symbol
  'tag$symbol', // Contains invalid symbol
  'tag%symbol', // Contains invalid symbol
  'tag^symbol', // Contains invalid symbol
  'tag&symbol', // Contains invalid symbol
  'tag*symbol', // Contains invalid symbol
  'tag(symbol)', // Contains invalid symbols
  'tag+symbol', // Contains invalid symbol
  'tag=symbol', // Contains invalid symbol
  'tag{symbol}', // Contains invalid symbols
  'tag[symbol]', // Contains invalid symbols
  'tag|symbol', // Contains invalid symbol
  'tag\\symbol', // Contains invalid symbol
  'tag:symbol', // Contains invalid symbol
  'tag;symbol', // Contains invalid symbol
  'tag"symbol"', // Contains invalid symbols
  "tag'symbol'", // Contains invalid symbols
  'tag<symbol>', // Contains invalid symbols
  'tag,symbol', // Contains invalid symbol
  'tag?symbol', // Contains invalid symbol
];

invalidTags.forEach(tag => {
  const result = validateTag(tag);
  console.log(`${tag}: ${result.isValid ? 'Valid ✓' : `Invalid ✗ - ${result.error}`}`);
});
