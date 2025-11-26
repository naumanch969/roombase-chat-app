/**
 * Unit Tests for Command Parser
 * Demonstrates test-first programming and partition-based testing
 * 
 * Test Strategy:
 * - Black-box testing: Test based on specification
 * - White-box testing: Test internal logic paths
 * - Partition testing: Cover equivalence classes
 * 
 * Partitions:
 * 1. Valid commands: edit, delete, mute, ban, reply
 * 2. Invalid commands: unknown, malformed
 * 3. Edge cases: empty input, special characters
 */

import CommandParser from '../src/utils/commandParser';

describe('CommandParser', () => {
   let parser: CommandParser;

   beforeEach(() => {
      parser = new CommandParser();
   });

   describe('parse() - Black-box Testing', () => {
      // Partition: Valid edit commands
      test('should parse valid edit command', () => {
         const result = parser.parse('/edit 123 new message text');
         
         expect(result.type).toBe('edit');
         expect(result.args).toEqual(['123', 'new', 'message', 'text']);
         expect(result.raw).toBe('/edit 123 new message text');
      });

      // Partition: Valid delete commands
      test('should parse valid delete command', () => {
         const result = parser.parse('/delete 456');
         
         expect(result.type).toBe('delete');
         expect(result.args).toEqual(['456']);
      });

      // Partition: Valid mute commands
      test('should parse valid mute command', () => {
         const result = parser.parse('/mute username123');
         
         expect(result.type).toBe('mute');
         expect(result.args).toEqual(['username123']);
      });

      // Partition: Valid ban commands
      test('should parse valid ban command', () => {
         const result = parser.parse('/ban spammer');
         
         expect(result.type).toBe('ban');
         expect(result.args).toEqual(['spammer']);
      });

      // Partition: Valid reply commands
      test('should parse valid reply command', () => {
         const result = parser.parse('/reply 789 this is a reply');
         
         expect(result.type).toBe('reply');
         expect(result.args).toEqual(['789', 'this', 'is', 'a', 'reply']);
      });

      // Partition: Invalid/unknown commands
      test('should handle unknown command', () => {
         const result = parser.parse('/unknown test');
         
         expect(result.type).toBe('unknown');
      });

      // Partition: Non-command messages
      test('should handle non-command message', () => {
         const result = parser.parse('regular chat message');
         
         expect(result.type).toBe('unknown');
         expect(result.args).toEqual([]);
      });

      // Edge case: Empty input
      test('should handle empty input', () => {
         const result = parser.parse('');
         
         expect(result.type).toBe('unknown');
      });

      // Edge case: Just slash
      test('should handle just slash', () => {
         const result = parser.parse('/');
         
         expect(result.type).toBe('unknown');
      });

      // Edge case: Command with quoted strings
      test('should parse command with quoted string', () => {
         const result = parser.parse('/edit 123 "new message with spaces"');
         
         expect(result.type).toBe('edit');
         expect(result.args).toContain('new message with spaces');
      });

      // Edge case: Case sensitivity
      test('should be case insensitive for command names', () => {
         const result = parser.parse('/EDIT 123 text');
         
         expect(result.type).toBe('edit');
      });
   });

   describe('validate() - White-box Testing', () => {
      // Test validation logic paths

      test('should validate edit command with message ID and text', () => {
         const command = parser.parse('/edit 123 new text');
         expect(parser.validate(command)).toBe(true);
      });

      test('should invalidate edit command without text', () => {
         const command = parser.parse('/edit 123');
         expect(parser.validate(command)).toBe(false);
      });

      test('should validate delete command with message ID', () => {
         const command = parser.parse('/delete 123');
         expect(parser.validate(command)).toBe(true);
      });

      test('should invalidate delete command with multiple args', () => {
         const command = { type: 'delete' as const, args: ['123', 'extra'], raw: '/delete 123 extra' };
         expect(parser.validate(command)).toBe(false);
      });

      test('should validate mute command with username', () => {
         const command = parser.parse('/mute user123');
         expect(parser.validate(command)).toBe(true);
      });

      test('should invalidate mute command without username', () => {
         const command = { type: 'mute' as const, args: [], raw: '/mute' };
         expect(parser.validate(command)).toBe(false);
      });

      test('should invalidate unknown command', () => {
         const command = parser.parse('/unknown test');
         expect(parser.validate(command)).toBe(false);
      });
   });

   describe('Precondition Testing', () => {
      test('should throw error for null input', () => {
         expect(() => parser.parse(null as any)).toThrow('Precondition violated');
      });

      test('should throw error for undefined input', () => {
         expect(() => parser.parse(undefined as any)).toThrow('Precondition violated');
      });
   });

   describe('AST Construction Testing', () => {
      // Testing internal parse tree and AST construction
      
      test('should handle multiple arguments correctly', () => {
         const result = parser.parse('/edit 123 one two three four');
         expect(result.args.length).toBe(5);
      });

      test('should handle numbers in arguments', () => {
         const result = parser.parse('/edit 123 456');
         expect(result.args).toContain('123');
         expect(result.args).toContain('456');
      });

      test('should preserve argument order', () => {
         const result = parser.parse('/edit 123 first second third');
         expect(result.args[0]).toBe('123');
         expect(result.args[1]).toBe('first');
         expect(result.args[2]).toBe('second');
         expect(result.args[3]).toBe('third');
      });
   });
});
