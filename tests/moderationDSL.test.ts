/**
 * Unit Tests for Moderation DSL
 * Tests domain-specific language parsing and rule evaluation
 */

import { ModerationDSLParser, ModerationRuleEngine } from '../src/utils/moderationDSL';

describe('ModerationDSLParser', () => {
   let parser: ModerationDSLParser;

   beforeEach(() => {
      parser = new ModerationDSLParser();
   });

   describe('parse()', () => {
      test('should parse simple condition rule', () => {
         const rule = parser.parse('when message contains "spam" then delete');

         expect(rule).not.toBeNull();
         expect(rule!.conditions.length).toBe(1);
         expect(rule!.conditions[0].field).toBe('message');
         expect(rule!.conditions[0].operator).toBe('contains');
         expect(rule!.conditions[0].value).toBe('spam');
         expect(rule!.action).toBe('delete');
      });

      test('should parse numeric comparison rule', () => {
         const rule = parser.parse('when word_count > 50 then warn');

         expect(rule).not.toBeNull();
         expect(rule!.conditions[0].field).toBe('word_count');
         expect(rule!.conditions[0].operator).toBe('>');
         expect(rule!.conditions[0].value).toBe(50);
         expect(rule!.action).toBe('warn');
      });

      test('should parse AND logic rules', () => {
         const rule = parser.parse('when message contains "bad" and word_count > 10 then flag');

         expect(rule).not.toBeNull();
         expect(rule!.logic).toBe('and');
         expect(rule!.conditions.length).toBe(2);
      });

      test('should parse OR logic rules', () => {
         const rule = parser.parse('when message contains "spam" or message contains "scam" then delete');

         expect(rule).not.toBeNull();
         expect(rule!.logic).toBe('or');
         expect(rule!.conditions.length).toBe(2);
      });

      test('should return null for invalid syntax', () => {
         const rule = parser.parse('invalid rule syntax');

         expect(rule).toBeNull();
      });

      test('should handle case insensitivity', () => {
         const rule = parser.parse('WHEN MESSAGE CONTAINS "test" THEN DELETE');

         expect(rule).not.toBeNull();
         expect(rule!.action).toBe('delete');
      });
   });

   describe('validate()', () => {
      test('should validate correct rule', () => {
         const rule = parser.parse('when message contains "spam" then delete');

         expect(parser.validate(rule!)).toBe(true);
      });

      test('should invalidate rule with invalid field', () => {
         const rule = {
            conditions: [{ field: 'invalid_field', operator: 'contains', value: 'test' }],
            action: 'delete',
            logic: 'and' as const
         };

         expect(parser.validate(rule)).toBe(false);
      });

      test('should invalidate rule with invalid action', () => {
         const rule = {
            conditions: [{ field: 'message', operator: 'contains', value: 'test' }],
            action: 'invalid_action',
            logic: 'and' as const
         };

         expect(parser.validate(rule)).toBe(false);
      });
   });
});

describe('ModerationRuleEngine', () => {
   let engine: ModerationRuleEngine;

   beforeEach(() => {
      engine = new ModerationRuleEngine();
   });

   describe('addRule()', () => {
      test('should add valid rule', () => {
         const success = engine.addRule({
            id: 'rule1',
            name: 'Spam Detection',
            condition: 'when message contains "spam" then delete',
            action: 'delete',
            enabled: true
         });

         expect(success).toBe(true);
      });

      test('should reject invalid rule', () => {
         const success = engine.addRule({
            id: 'rule1',
            name: 'Invalid Rule',
            condition: 'invalid syntax',
            action: 'delete',
            enabled: true
         });

         expect(success).toBe(false);
      });
   });

   describe('evaluate()', () => {
      test('should detect spam in message', () => {
         engine.addRule({
            id: 'spam-rule',
            name: 'Spam Detection',
            condition: 'when message contains "spam" then delete',
            action: 'delete',
            enabled: true
         });

         const actions = engine.evaluate('This is spam message', 'user1');

         expect(actions).toContain('delete');
      });

      test('should check word count', () => {
         engine.addRule({
            id: 'length-rule',
            name: 'Length Check',
            condition: 'when word_count > 5 then warn',
            action: 'warn',
            enabled: true
         });

         const actions = engine.evaluate('one two three four five six', 'user1');

         expect(actions).toContain('warn');
      });

      test('should not trigger disabled rules', () => {
         engine.addRule({
            id: 'disabled-rule',
            name: 'Disabled',
            condition: 'when message contains "test" then delete',
            action: 'delete',
            enabled: false
         });

         const actions = engine.evaluate('test message', 'user1');

         expect(actions).not.toContain('delete');
      });

      test('should evaluate AND logic correctly', () => {
         engine.addRule({
            id: 'and-rule',
            name: 'AND Test',
            condition: 'when message contains "bad" and word_count > 2 then flag',
            action: 'flag',
            enabled: true
         });

         const actions1 = engine.evaluate('bad word here', 'user1');
         expect(actions1).toContain('flag');

         const actions2 = engine.evaluate('bad', 'user1');
         expect(actions2).not.toContain('flag'); // word_count not > 2
      });

      test('should evaluate OR logic correctly', () => {
         engine.addRule({
            id: 'or-rule',
            name: 'OR Test',
            condition: 'when message contains "spam" or message contains "scam" then delete',
            action: 'delete',
            enabled: true
         });

         const actions1 = engine.evaluate('This is spam', 'user1');
         expect(actions1).toContain('delete');

         const actions2 = engine.evaluate('This is scam', 'user1');
         expect(actions2).toContain('delete');

         const actions3 = engine.evaluate('Normal message', 'user1');
         expect(actions3).not.toContain('delete');
      });

      test('should check username in rules', () => {
         engine.addRule({
            id: 'user-rule',
            name: 'User Check',
            condition: 'when user equals "baduser" then ban',
            action: 'ban',
            enabled: true
         });

         const actions = engine.evaluate('any message', 'baduser');

         expect(actions).toContain('ban');
      });
   });

   describe('toggleRule()', () => {
      test('should enable/disable rules', () => {
         engine.addRule({
            id: 'toggle-rule',
            name: 'Toggle Test',
            condition: 'when message contains "test" then warn',
            action: 'warn',
            enabled: true
         });

         engine.toggleRule('toggle-rule', false);
         let actions = engine.evaluate('test message', 'user1');
         expect(actions).not.toContain('warn');

         engine.toggleRule('toggle-rule', true);
         actions = engine.evaluate('test message', 'user1');
         expect(actions).toContain('warn');
      });
   });

   describe('removeRule()', () => {
      test('should remove rule', () => {
         engine.addRule({
            id: 'remove-rule',
            name: 'Remove Test',
            condition: 'when message contains "test" then delete',
            action: 'delete',
            enabled: true
         });

         const success = engine.removeRule('remove-rule');
         expect(success).toBe(true);

         const actions = engine.evaluate('test message', 'user1');
         expect(actions).not.toContain('delete');
      });
   });
});
