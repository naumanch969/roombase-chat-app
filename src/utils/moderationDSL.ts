/**
 * Domain-Specific Language (DSL) for Chat Moderation
 * Implements a little language for automation rules
 * 
 * Grammar:
 * Rule -> 'when' Condition 'then' Action
 * Condition -> Expression ('and' Expression | 'or' Expression)*
 * Expression -> Field Operator Value
 * Field -> 'message' | 'user' | 'word_count'
 * Operator -> 'contains' | 'equals' | 'matches' | '>' | '<' | '>=' | '<='
 * Action -> 'mute' | 'ban' | 'delete' | 'warn' | 'flag'
 * 
 * Example Rules:
 * "when message contains 'spam' then delete"
 * "when word_count > 50 then warn"
 * "when user equals 'baduser' then ban"
 */

import { ModerationRule } from '../types/index';

interface RuleCondition {
   field: string;
   operator: string;
   value: string | number;
}

interface ParsedRule {
   conditions: RuleCondition[];
   action: string;
   logic: 'and' | 'or';
}

/**
 * DSL Parser for Moderation Rules
 */
export class ModerationDSLParser {
   /**
    * Parse a rule string into structured format
    * @param ruleString - DSL rule string
    * @returns Parsed rule object
    */
   public parse(ruleString: string): ParsedRule | null {
      const normalized = ruleString.toLowerCase().trim();

      // Extract condition and action parts
      const whenThenMatch = normalized.match(/when\s+(.+)\s+then\s+(\w+)/);
      if (!whenThenMatch) {
         return null;
      }

      const conditionPart = whenThenMatch[1];
      const action = whenThenMatch[2];

      // Determine logic operator
      const logic: 'and' | 'or' = conditionPart.includes(' or ') ? 'or' : 'and';

      // Split conditions
      const conditionStrings = conditionPart.split(logic === 'and' ? ' and ' : ' or ');
      const conditions: RuleCondition[] = [];

      for (const condStr of conditionStrings) {
         const condition = this.parseCondition(condStr.trim());
         if (condition) {
            conditions.push(condition);
         }
      }

      if (conditions.length === 0) {
         return null;
      }

      return { conditions, action, logic };
   }

   /**
    * Parse a single condition
    */
   private parseCondition(condStr: string): RuleCondition | null {
      // Try different operators in order of specificity
      const operators = ['contains', 'equals', 'matches', '>=', '<=', '>', '<'];

      for (const op of operators) {
         const parts = condStr.split(` ${op} `);
         if (parts.length === 2) {
            const field = parts[0].trim();
            let value: string | number = parts[1].trim().replace(/['"]/g, '');

            // Try to parse as number
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
               value = numValue;
            }

            return { field, operator: op, value };
         }
      }

      return null;
   }

   /**
    * Validate a parsed rule
    */
   public validate(rule: ParsedRule): boolean {
      const validFields = ['message', 'user', 'username', 'word_count', 'length'];
      const validOperators = ['contains', 'equals', 'matches', '>', '<', '>=', '<='];
      const validActions = ['mute', 'ban', 'delete', 'warn', 'flag'];

      // Validate action
      if (!validActions.includes(rule.action)) {
         return false;
      }

      // Validate each condition
      for (const condition of rule.conditions) {
         if (!validFields.includes(condition.field)) {
            return false;
         }
         if (!validOperators.includes(condition.operator)) {
            return false;
         }
      }

      return true;
   }
}

/**
 * Moderation Rule Engine
 * Evaluates rules against messages and executes actions
 */
export class ModerationRuleEngine {
   private rules: Map<string, ModerationRule>;
   private parser: ModerationDSLParser;

   constructor() {
      this.rules = new Map();
      this.parser = new ModerationDSLParser();
   }

   /**
    * Add a moderation rule
    */
   public addRule(rule: ModerationRule): boolean {
      const parsed = this.parser.parse(rule.condition);
      if (!parsed || !this.parser.validate(parsed)) {
         return false;
      }

      this.rules.set(rule.id, rule);
      return true;
   }

   /**
    * Remove a rule
    */
   public removeRule(ruleId: string): boolean {
      return this.rules.delete(ruleId);
   }

   /**
    * Enable/disable a rule
    */
   public toggleRule(ruleId: string, enabled: boolean): boolean {
      const rule = this.rules.get(ruleId);
      if (!rule) {
         return false;
      }
      rule.enabled = enabled;
      return true;
   }

   /**
    * Evaluate a message against all enabled rules
    * @param message - Message text
    * @param username - Username of sender
    * @returns Array of actions to execute
    */
   public evaluate(message: string, username: string): string[] {
      const actions: string[] = [];

      for (const rule of this.rules.values()) {
         if (!rule.enabled) {
            continue;
         }

         const parsed = this.parser.parse(rule.condition);
         if (!parsed) {
            continue;
         }

         if (this.evaluateRule(parsed, message, username)) {
            const actionParsed = this.parser.parse(rule.action);
            if (actionParsed) {
               actions.push(actionParsed.action);
            } else {
               // Simple action format
               actions.push(rule.action);
            }
         }
      }

      return actions;
   }

   /**
    * Evaluate a single parsed rule
    */
   private evaluateRule(rule: ParsedRule, message: string, username: string): boolean {
      const results: boolean[] = [];

      for (const condition of rule.conditions) {
         const result = this.evaluateCondition(condition, message, username);
         results.push(result);
      }

      // Apply logic operator
      if (rule.logic === 'and') {
         return results.every(r => r);
      } else {
         return results.some(r => r);
      }
   }

   /**
    * Evaluate a single condition
    */
   private evaluateCondition(condition: RuleCondition, message: string, username: string): boolean {
      let fieldValue: string | number;

      // Get field value
      switch (condition.field) {
         case 'message':
            fieldValue = message.toLowerCase();
            break;
         case 'user':
         case 'username':
            fieldValue = username.toLowerCase();
            break;
         case 'word_count':
            fieldValue = message.split(/\s+/).length;
            break;
         case 'length':
            fieldValue = message.length;
            break;
         default:
            return false;
      }

      // Apply operator
      const condValue = typeof condition.value === 'string' 
         ? condition.value.toLowerCase() 
         : condition.value;

      switch (condition.operator) {
         case 'contains':
            return typeof fieldValue === 'string' && 
                   fieldValue.includes(condValue as string);
         case 'equals':
            return fieldValue === condValue;
         case 'matches':
            try {
               const regex = new RegExp(condValue as string);
               return typeof fieldValue === 'string' && regex.test(fieldValue);
            } catch {
               return false;
            }
         case '>':
            return typeof fieldValue === 'number' && 
                   fieldValue > (condValue as number);
         case '<':
            return typeof fieldValue === 'number' && 
                   fieldValue < (condValue as number);
         case '>=':
            return typeof fieldValue === 'number' && 
                   fieldValue >= (condValue as number);
         case '<=':
            return typeof fieldValue === 'number' && 
                   fieldValue <= (condValue as number);
         default:
            return false;
      }
   }

   /**
    * Get all rules
    */
   public getRules(): ModerationRule[] {
      return Array.from(this.rules.values());
   }

   /**
    * Get rule by ID
    */
   public getRule(ruleId: string): ModerationRule | undefined {
      return this.rules.get(ruleId);
   }
}

// Export singleton instance
export const moderationEngine = new ModerationRuleEngine();
