import { lowerCaseTransformer } from './lower-case.transformer'; // Điều chỉnh đường dẫn nếu cần
import { TransformFnParams } from 'class-transformer';

describe('lowerCaseTransformer', () => {
  // Test case 1: Chuỗi hợp lệ, cần chuyển sang chữ thường và loại bỏ khoảng trắng
  test('should convert a string to lowercase and trim it', () => {
    const params: TransformFnParams = {
      value: '  HeLlO wOrLd  ',
      key: 'testKey',
      obj: {},
      type: 1, // Loại chuyển đổi (ví dụ: 'plainToClass')
      options: {},
    };

    const result = lowerCaseTransformer(params);
    expect(result).toBe('hello world');
  });

  // Test case 2: Chuỗi đã là chữ thường và không có khoảng trắng
  test('should return the string as is if already lowercase and trimmed', () => {
    const params: TransformFnParams = {
      value: 'simplevalue',
      key: 'testKey',
      obj: {},
      type: 1,
      options: {},
    };

    const result = lowerCaseTransformer(params);
    expect(result).toBe('simplevalue');
  });

  // Test case 3: Giá trị là undefined
  test('should return undefined when the value is undefined', () => {
    const params: TransformFnParams = {
      value: undefined,
      key: 'testKey',
      obj: {},
      type: 1,
      options: {},
    };

    const result = lowerCaseTransformer(params);
    expect(result).toBeUndefined();
  });

  // Test case 4: Giá trị là null
  test('should return undefined when the value is null', () => {
    const params: TransformFnParams = {
      value: null,
      key: 'testKey',
      obj: {},
      type: 1,
      options: {},
    };

    const result = lowerCaseTransformer(params);
    expect(result).toBeUndefined();
  });

  // Test case 5: Giá trị là một số (không phải chuỗi)
  test('should return undefined when the value is a number', () => {
    const params: TransformFnParams = {
      value: 12345, // Giá trị không phải chuỗi
      key: 'testKey',
      obj: {},
      type: 1,
      options: {},
    };

    const result = lowerCaseTransformer(params);
    expect(result).toBeUndefined();
  });

  // Test case 6: Chuỗi chỉ chứa khoảng trắng
  test('should return an empty string when the value is only whitespace', () => {
    const params: TransformFnParams = {
      value: '   \t  \n  ', // Chỉ chứa khoảng trắng
      key: 'testKey',
      obj: {},
      type: 1,
      options: {},
    };

    const result = lowerCaseTransformer(params);
    expect(result).toBe('');
  });
});
