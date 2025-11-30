/**
 * Command Parser Module
 * Implements parsing for chat commands using grammar-based parsing
 * Demonstrates software construction concepts: parsing, AST construction, error handling
 */

import { ParsedCommand } from '../types/index';

/**
 * Token types for lexical analysis
 */
enum TokenType {
   COMMAND = 'COMMAND',
   ARGUMENT = 'ARGUMENT',
   STRING = 'STRING',
   NUMBER = 'NUMBER',
   EOF = 'EOF'
}

interface Token {
   type: TokenType;
   value: string;
}

/**
 * AST Node types for command representation
 */
interface ASTNode {
   type: string;
   value?: string;
   children?: ASTNode[];
}

/**
 * Command Parser Class
 * Implements lexical analysis and parsing for chat commands
 * 
 * Grammar:
 * Command -> '/' CommandName Arguments
 * CommandName -> 'edit' | 'delete' | 'mute' | 'ban' | 'reply'
 * Arguments -> Argument*
 * Argument -> STRING | NUMBER
 * 
 * Preconditions:
 * - Input must be a non-null string
 * Postconditions:
 * - Returns a valid ParsedCommand object
 * - Invalid commands are marked as 'unknown' type
 */
class CommandParser {
   private input: string;
   private position: number;
   private currentChar: string | null;

   /**
    * Representation Invariant:
    * - position >= 0 && position <= input.length
    * - currentChar is null iff position >= input.length
    */
   constructor() {
      this.input = '';
      this.position = 0;
      this.currentChar = null;
      this.checkRep();
   }

   /**
    * Check representation invariant
    */
   private checkRep(): void {
      if (this.position < 0 || this.position > this.input.length) {
         throw new Error('Invariant violation: position out of bounds');
      }
      if (this.position >= this.input.length && this.currentChar !== null) {
         throw new Error('Invariant violation: currentChar should be null at end');
      }
   }

   /**
    * Tokenize input string into tokens (Lexical Analysis)
    * @param input - Raw command string
    * @returns Array of tokens
    */
   private tokenize(input: string): Token[] {
      const tokens: Token[] = [];
      let i = 0;

      while (i < input.length) {
         const char = input[i];

         // Skip whitespace
         if (char === ' ' || char === '\t') {
            i++;
            continue;
         }

         // Command token (starts with /)
         if (char === '/' && i === 0) {
            i++; // Skip '/'
            let command = '';
            while (i < input.length && input[i] !== ' ' && input[i] !== '\t') {
               command += input[i];
               i++;
            }
            tokens.push({ type: TokenType.COMMAND, value: command });
            continue;
         }

         // Quoted string
         if (char === '"' || char === "'") {
            const quote = char;
            i++; // Skip opening quote
            let str = '';
            while (i < input.length && input[i] !== quote) {
               str += input[i];
               i++;
            }
            i++; // Skip closing quote
            tokens.push({ type: TokenType.STRING, value: str });
            continue;
         }

         // Number
         if (char >= '0' && char <= '9') {
            let num = '';
            while (i < input.length && input[i] >= '0' && input[i] <= '9') {
               num += input[i];
               i++;
            }
            tokens.push({ type: TokenType.NUMBER, value: num });
            continue;
         }

         // Regular argument (no spaces)
         let arg = '';
         while (i < input.length && input[i] !== ' ' && input[i] !== '\t') {
            arg += input[i];
            i++;
         }
         if (arg.length > 0) {
            tokens.push({ type: TokenType.ARGUMENT, value: arg });
         }
      }

      tokens.push({ type: TokenType.EOF, value: '' });
      return tokens;
   }

   /**
    * Build Abstract Syntax Tree from tokens
    * @param tokens - Array of tokens from lexical analysis
    * @returns AST root node
    */
   private buildAST(tokens: Token[]): ASTNode {
      if (tokens.length === 0 || tokens[0].type !== TokenType.COMMAND) {
         return { type: 'INVALID_COMMAND' };
      }

      const root: ASTNode = {
         type: 'COMMAND_NODE',
         value: tokens[0].value,
         children: []
      };

      // Parse arguments
      for (let i = 1; i < tokens.length && tokens[i].type !== TokenType.EOF; i++) {
         const token = tokens[i];
         root.children!.push({
            type: token.type,
            value: token.value
         });
      }

      return root;
   }

   /**
    * Parse command string into structured ParsedCommand object
    * Performs lexical analysis, builds AST, and extracts command structure
    * 
    * @param input - Raw command string (e.g., "/edit 123 new text")
    * @returns ParsedCommand object with type and arguments
    * 
    * Preconditions:
    * - input !== null && input !== undefined
    * Postconditions:
    * - Returns valid ParsedCommand with type and args array
    * - If input doesn't start with '/', returns 'unknown' type
    */
   public parse(input: string): ParsedCommand {
      // Precondition check
      if (input === null || input === undefined) {
         throw new Error('Precondition violated: input cannot be null or undefined');
      }

      this.input = input.trim();
      this.position = 0;
      this.currentChar = this.input.length > 0 ? this.input[0] : null;
      this.checkRep();

      // Not a command
      if (!this.input.startsWith('/')) {
         return {
            type: 'unknown',
            args: [],
            raw: input
         };
      }

      // Tokenize and build AST
      const tokens = this.tokenize(this.input);
      const ast = this.buildAST(tokens);

      // Extract command type and arguments from AST
      if (ast.type === 'INVALID_COMMAND' || !ast.value) {
         return {
            type: 'unknown',
            args: [],
            raw: input
         };
      }

      const commandType = ast.value.toLowerCase();
      const validCommands = ['edit', 'delete', 'mute', 'ban', 'reply'];
      
      const type = validCommands.includes(commandType) 
         ? commandType as ParsedCommand['type']
         : 'unknown';

      const args = ast.children?.map(child => child.value!) || [];

      const result: ParsedCommand = {
         type,
         args,
         raw: input
      };

      // Postcondition check
      if (!result.type || !Array.isArray(result.args)) {
         throw new Error('Postcondition violated: invalid ParsedCommand structure');
      }

      return result;
   }

   /**
    * Validate command syntax and arguments
    * @param command - Parsed command to validate
    * @returns true if valid, false otherwise
    */
   public validate(command: ParsedCommand): boolean {
      switch (command.type) {
         case 'edit':
            // /edit <messageId> <newText>
            return command.args.length >= 2;
         case 'delete':
            // /delete <messageId>
            return command.args.length === 1;
         case 'mute':
         case 'ban':
            // /mute <username> or /ban <username>
            return command.args.length === 1;
         case 'reply':
            // /reply <messageId> <text>
            return command.args.length >= 2;
         case 'unknown':
            return false;
         default:
            return false;
      }
   }


   /**
    * RECURSION: Validate grammar for nested expressions
    * Demonstrates proper recursive grammar rules with termination
    * 
    * Bad grammar (causes infinite loop):
    *   Expression -> Expression '+' Number
    * 
    * Good grammar (terminates properly):
    *   Expression -> Term ('+' Term)*
    *   Term -> Number | '(' Expression ')'
    * 
    * @param expr - Expression string to validate
    * @returns true if valid, false otherwise
    */
   public validateExpression(expr: string): boolean {
      let pos = 0;

      /**
       * Parse Term (base case)
       * Term -> Number
       */
      const parseTerm = (): boolean => {
         // Base case: Single number
         if (pos < expr.length && expr[pos] >= '0' && expr[pos] <= '9') {
            while (pos < expr.length && expr[pos] >= '0' && expr[pos] <= '9') {
               pos++;
            }
            return true;
         }
         return false;
      };

      /**
       * Parse Expression (recursive case)
       * Expression -> Term ('+' Term)*
       * The * means zero or more, which ensures termination
       */
      const parseExpression = (): boolean => {
         // Must start with a term (ensures progress)
         if (!parseTerm()) {
            return false;
         }

         // Optionally followed by more terms
         while (pos < expr.length && expr[pos] === '+') {
            pos++; // Consume '+'
            if (!parseTerm()) {
               return false;
            }
         }

         return true;
      };

      return parseExpression() && pos === expr.length;
   }
}

/**
 * Factory function to create parser instance
 */
export function createParser(): CommandParser {
   return new CommandParser();
}

export default CommandParser;
