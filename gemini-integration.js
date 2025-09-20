// Gemini AI Integration for CodeSage
class GeminiCodeAnalyzer {
    constructor() {
        this.apiKey = 'YOUR_GEMINI_API_KEY_HERE'; // User needs to replace this
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    }

    // Set API key
    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
    }

    // Get API key from localStorage
    getApiKey() {
        return localStorage.getItem('gemini_api_key') || this.apiKey;
    }

    // Main code analysis function
    async analyzeCode(code) {
        if (!this.getApiKey() || this.getApiKey() === 'YOUR_GEMINI_API_KEY_HERE') {
            throw new Error('Please set your Gemini API key first');
        }

        const prompt = this.createAnalysisPrompt(code);
        
        try {
            const response = await fetch(`${this.apiUrl}?key=${this.getApiKey()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(`Gemini API Error: ${data.error.message}`);
            }

            const responseText = data.candidates[0].content.parts[0].text;
            return this.parseAnalysisResponse(responseText);
            
        } catch (error) {
            console.error('Error analyzing code:', error);
            throw error;
        }
    }

    // Create comprehensive analysis prompt
    createAnalysisPrompt(code) {
        return `You are CodeSage, an expert Python code reviewer and AI mentor. Analyze the following Python code STRICTLY and HONESTLY. Do NOT be generous - identify EVERY issue, no matter how small.

CODE TO ANALYZE:
\`\`\`python
${code}
\`\`\`

Provide your analysis in this exact JSON format only:
{
  "overallScore": number between 1-10,
  "codeQuality": "Poor|Fair|Good|Excellent",
  "issues": [
    {
      "type": "Style|Bug|Security|Efficiency|Readability",
      "severity": "Low|Medium|High|Critical",
      "description": "Brief description of the issue",
      "problem": "Detailed explanation of why this is a problem",
      "fix": "Specific suggested fix with code examples if needed",
      "lineNumbers": "affected line numbers or range"
    }
  ],
  "explanation": "Beginner-friendly explanation of the main issues",
  "analogy": "Real-life analogy to help understand the concepts",
  "practiceTasks": [
    "Specific practice task 1",
    "Specific practice task 2", 
    "Specific practice task 3"
  ],
  "fixedCode": "The complete corrected version of the code with all improvements applied",
  "keyImprovements": [
    "Summary of major improvement 1",
    "Summary of major improvement 2"
  ]
}

STRICT ANALYSIS CRITERIA - BE THOROUGH:
• **Style**: Check EVERY line for PEP8 compliance, naming conventions, comments, formatting consistency
• **Bug**: Identify ALL logical errors, runtime errors, unhandled exceptions, edge cases, syntax issues
• **Security**: Look for ANY input validation issues, hardcoded secrets, potential vulnerabilities
• **Efficiency**: Find ALL algorithm complexity issues, memory usage problems, performance bottlenecks
• **Readability**: Assess ALL variable naming, function structure, documentation, code organization

STRICT SCORING GUIDELINES - FOLLOW EXACTLY:
• **1-2 Points**: Code has multiple CRITICAL errors (syntax errors, runtime crashes, security vulnerabilities)
• **3-4 Points**: Code has several HIGH severity issues (logical errors, major style violations, efficiency problems)
• **5-6 Points**: Code works but has multiple MEDIUM issues (style inconsistencies, minor bugs, readability problems)
• **7-8 Points**: Code is generally functional with only MINOR issues (small style improvements, minor readability tweaks)
• **9-10 Points**: NEAR PERFECT code - follows all best practices, no significant issues found

MANDATORY REQUIREMENTS:
1. **Be Critical**: If you find ANY issues, you MUST deduct points accordingly
2. **Be Specific**: Identify EXACT line numbers and provide concrete examples
3. **Be Honest**: Do NOT give high scores to code with obvious problems
4. **Be Thorough**: Check for ALL types of issues, not just obvious ones
5. **Score Accurately**: A 5/10 means AVERAGE code with noticeable issues
6. **Provide Examples**: Show specific code examples of problems and fixes

COMMON ISSUES TO LOOK FOR:
• Missing error handling (try/catch blocks)
• Poor variable names (single letters, unclear names)
• Missing comments or docstrings
• Inconsistent indentation or spacing
• Hardcoded values instead of variables
• Missing input validation
• Inefficient algorithms or data structures
• Unused variables or imports
• Missing return statements
• Improper function structure

Remember: Your goal is to help the user improve, NOT to make them feel good. Be honest, specific, and constructive. If the code deserves a low score, give it a low score with clear reasons why.`;
    }

    // Parse Gemini's response into structured data
    parseAnalysisResponse(responseText) {
        try {
            // Clean and extract JSON from the response
            const cleanedText = responseText.replace(/^[\s\S]*?\{/, '{').replace(/\}[\s\S]*?$/, '}');
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            
            if (!jsonMatch) {
                throw new Error('No valid JSON found in response');
            }

            const analysis = JSON.parse(jsonMatch[0]);
            
            // Validate the response structure with enhanced checks
            if (!analysis.overallScore || !analysis.issues || !Array.isArray(analysis.issues)) {
                throw new Error('Invalid analysis structure');
            }

            // Ensure overall score is within range
            analysis.overallScore = Math.max(1, Math.min(10, analysis.overallScore));
            
            // Set default code quality if not provided
            analysis.codeQuality = analysis.codeQuality || this.getScoreQuality(analysis.overallScore);
            
            // Validate and enhance issues
            analysis.issues = analysis.issues.filter(issue => {
                const isValid = issue.type && issue.description && issue.problem && issue.fix;
                if (isValid) {
                    // Ensure severity is set
                    issue.severity = issue.severity || this.getIssueSeverity(issue.type, issue.description);
                    // Ensure lineNumbers is set
                    issue.lineNumbers = issue.lineNumbers || 'Unknown';
                }
                return isValid;
            });

            // Ensure keyImprovements exists
            analysis.keyImprovements = analysis.keyImprovements || [];
            
            // Validate other required fields
            analysis.explanation = analysis.explanation || 'No explanation provided.';
            analysis.analogy = analysis.analogy || 'No analogy provided.';
            analysis.practiceTasks = analysis.practiceTasks || [];
            
            return analysis;
            
        } catch (error) {
            console.error('Error parsing analysis response:', error);
            console.log('Raw response:', responseText);
            
            // Enhanced fallback response if parsing fails
            return {
                overallScore: this.calculateFallbackScore(responseText), // Use new scoring method
                codeQuality: 'Fair',
                issues: this.generateFallbackIssues(responseText), // Use new issue generation method
                explanation: 'I had trouble analyzing your code in detail, but I can see some areas for improvement. Let me help you understand the main issues.',
                analogy: 'Think of code review like proofreading an essay - sometimes you need to look at it multiple times to catch all the mistakes.',
                practiceTasks: [
                    'Review Python PEP8 style guidelines',
                    'Test your code with different inputs',
                    'Add comments to explain your logic'
                ],
                fixedCode: responseText, // Return original response as fallback
                keyImprovements: [
                    'Focus on code structure and organization',
                    'Add proper error handling'
                ]
            };
        }
    }

    // Helper method to calculate fallback score based on code complexity
    calculateFallbackScore(code) {
        const complexity = this.calculateCodeComplexity(code);
        if (complexity > 50) return 3; // High complexity, low score
        if (complexity > 20) return 5; // Medium complexity, average score
        return 7; // Low complexity, high score
    }

    // Helper method to calculate code complexity (simple heuristic)
    calculateCodeComplexity(code) {
        const lines = code.split('\n');
        const complexity = lines.reduce((acc, line) => {
            if (line.includes('if') || line.includes('for') || line.includes('while')) {
                return acc + 2;
            }
            if (line.includes('def') || line.includes('class')) {
                return acc + 3;
            }
            return acc + 1;
        }, 0);
        return complexity;
    }

    // Helper method to generate fallback issues based on code complexity
    generateFallbackIssues(code) {
        const complexity = this.calculateCodeComplexity(code);
        if (complexity > 50) {
            return [
                {
                    type: "Efficiency",
                    severity: "High",
                    description: "High complexity code detected",
                    problem: "The code may have performance issues due to high complexity",
                    fix: "Consider refactoring the code to reduce complexity",
                    lineNumbers: "Multiple lines"
                }
            ];
        }
        if (complexity > 20) {
            return [
                {
                    type: "Readability",
                    severity: "Medium",
                    description: "Code readability issues detected",
                    problem: "The code may be hard to understand due to poor formatting",
                    fix: "Review and apply consistent formatting following PEP8 guidelines",
                    lineNumbers: "Multiple lines"
                }
            ];
        }
        return [];
    }

    // Helper method to get code quality from score
    getScoreQuality(score) {
        if (score >= 9) return 'Excellent';
        if (score >= 7) return 'Good';
        if (score >= 4) return 'Fair';
        return 'Poor';
    }

    // Helper method to determine issue severity - ENHANCED VERSION
    getIssueSeverity(type, description) {
        const severityMap = {
            'Security': 'Critical',
            'Bug': 'High',
            'Efficiency': 'Medium',
            'Style': 'Low',
            'Readability': 'Low'
        };
        
        // Check for critical keywords that indicate severe problems
        const criticalKeywords = [
            'crash', 'security', 'vulnerable', 'injection', 'breach', 'exploit',
            'syntax error', 'runtime error', 'fatal', 'exception', 'error',
            'broken', 'fail', 'invalid', 'undefined', 'null', 'none'
        ];
        
        // Check for high severity keywords
        const highKeywords = [
            'logical error', 'bug', 'incorrect', 'wrong', 'mistake',
            'inefficient', 'slow', 'performance', 'memory leak',
            'missing', 'lack', 'no error handling', 'no validation'
        ];
        
        // Check for medium severity keywords
        const mediumKeywords = [
            'should', 'recommend', 'consider', 'improve', 'better',
            'inconsistent', 'unclear', 'confusing', 'hard to read'
        ];
        
        const descLower = description.toLowerCase();
        
        // Check for critical issues first
        if (criticalKeywords.some(keyword => descLower.includes(keyword))) {
            return 'Critical';
        }
        
        // Check for high severity issues
        if (highKeywords.some(keyword => descLower.includes(keyword))) {
            return 'High';
        }
        
        // Check for medium severity issues
        if (mediumKeywords.some(keyword => descLower.includes(keyword))) {
            return 'Medium';
        }
        
        // Default to type-based severity
        return severityMap[type] || 'Medium';
    }

    // Generate beginner-friendly explanation
    async generateBeginnerExplanation(issue) {
        const prompt = `You are CodeSage, a friendly and patient coding teacher. Explain this programming concept to someone who has never coded before.

CONCEPT TO EXPLAIN:
• Issue Type: ${issue.type}
• Description: ${issue.description}
• Problem: ${issue.problem}
• Solution: ${issue.fix}

Create an explanation that:
1. **Uses simple, everyday analogies** that anyone can understand
2. **Breaks down complex ideas** into small, digestible pieces
3. **Avoids technical jargon** or explains it in simple terms
4. **Is encouraging and positive** - makes learning feel fun and achievable
5. **Includes a step-by-step guide** for understanding
6. **Provides 2-3 simple practice exercises** they can try

Format your response in a friendly, conversational tone like you're teaching a friend. Use emojis where appropriate to make it more engaging. 🌟

Remember: The goal is to make the learner feel confident and excited about coding!`;

        try {
            const response = await fetch(`${this.apiUrl}?key=${this.getApiKey()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.8,  // Higher temperature for more creative explanations
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(`Gemini API Error: ${data.error.message}`);
            }

            return data.candidates[0].content.parts[0].text;
            
        } catch (error) {
            console.error('Error generating explanation:', error);
            return this.generateFallbackExplanation(issue);
        }
    }

    // Generate code improvement suggestions
    async generateImprovementSuggestions(originalCode, analysis) {
        const prompt = `You are CodeSage, an expert Python mentor. Based on the code analysis, provide actionable improvement suggestions.

ORIGINAL CODE:
\`\`\`python
${originalCode}
\`\`\`

ANALYSIS SUMMARY:
• Overall Score: ${analysis.overallScore}/10
• Code Quality: ${analysis.codeQuality}
• Issues Found: ${analysis.issues.length}
• Key Issues: ${analysis.issues.slice(0, 3).map(issue => issue.type).join(', ')}

Provide a comprehensive improvement plan with:
1. **Priority Action Items** (3-5 specific, actionable steps)
2. **Learning Resources** (specific topics to study)
3. **Practice Exercises** (2-3 coding challenges to reinforce learning)
4. **Next Steps** (what to focus on after these improvements)
5. **Encouragement** (motivational message to keep learning)

Format your response as a friendly, actionable learning plan. Be specific and practical! 🚀`;

        try {
            const response = await fetch(`${this.apiUrl}?key=${this.getApiKey()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(`Gemini API Error: ${data.error.message}`);
            }

            return data.candidates[0].content.parts[0].text;
            
        } catch (error) {
            console.error('Error generating improvement suggestions:', error);
            return this.generateFallbackSuggestions(analysis);
        }
    }

    // Generate fallback improvement suggestions
    generateFallbackSuggestions(analysis) {
        return `## 🎯 Your Learning Plan

### Priority Action Items:
1. **Review PEP8 Guidelines** - Focus on consistent formatting and naming conventions
2. **Add Error Handling** - Include try-catch blocks for potential errors
3. **Improve Variable Names** - Use descriptive names that explain the purpose
4. **Add Comments** - Document complex logic and important decisions
5. **Test Edge Cases** - Consider unusual inputs and boundary conditions

### Learning Resources:
• [Python PEP8 Style Guide](https://www.python.org/dev/peps/pep-0008/)
• [Python Error Handling Tutorial](https://docs.python.org/3/tutorial/errors.html)
• [Clean Code Principles](https://blog.cleancoder.com/uncle-bob/2008/09/09/the-principles-of-clean-code.html)

### Practice Exercises:
1. **Refactor Challenge**: Take your code and apply all the suggested improvements
2. **Code Review**: Find a friend or online community to review your improved code
3. **Build Something New**: Apply these principles to a small new project

### Next Steps:
Once you've implemented these improvements, focus on:
• Learning about design patterns
• Understanding algorithm complexity
• Exploring testing frameworks

### Encouragement:
You're doing great! Every improvement you make helps you become a better programmer. Keep coding and keep learning! 💪✨`;
    }

    // Generate fixed code with improvements
    async generateFixedCode(originalCode, issues) {
        const issuesText = issues.map(issue => 
            `• ${issue.type} (${issue.severity}): ${issue.description}\n  Problem: ${issue.problem}\n  Fix: ${issue.fix}`
        ).join('\n\n');

        const prompt = `You are CodeSage, an expert Python developer. Generate an improved version of the following code that addresses all identified issues.

ORIGINAL CODE:
\`\`\`python
${originalCode}
\`\`\`

ISSUES TO ADDRESS:
${issuesText}

REQUIREMENTS FOR IMPROVED CODE:
1. **PEP8 Compliance**: Proper indentation, line length limits, naming conventions
2. **Enhanced Readability**: Better variable names, clear structure, appropriate comments
3. **Bug Fixes**: Resolve logical errors, handle edge cases, add proper error handling
4. **Security Improvements**: Validate inputs, avoid hardcoded secrets, prevent vulnerabilities
5. **Performance Optimization**: Improve algorithms, reduce complexity where possible
6. **Documentation**: Add docstrings and comments explaining complex logic
7. **Best Practices**: Follow Python idioms and modern Python conventions

Please provide:
1. The complete improved code within \`\`\`python\`\`\` blocks
2. A brief summary of the key improvements made
3. Any additional recommendations for further enhancement

Focus on making the code production-ready while maintaining the original functionality.`;

        try {
            const response = await fetch(`${this.apiUrl}?key=${this.getApiKey()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,  // Lower temperature for more consistent code
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 4096,  // Increased for longer code
                    }
                })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(`Gemini API Error: ${data.error.message}`);
            }

            const responseText = data.candidates[0].content.parts[0].text;
            
            // Extract code from markdown blocks with improved regex
            const codeMatch = responseText.match(/```python\n([\s\S]*?)\n```/);
            const extractedCode = codeMatch ? codeMatch[1].trim() : originalCode;
            
            // Validate the extracted code
            if (!extractedCode || extractedCode.length < originalCode.length * 0.5) {
                console.warn('Extracted code seems too short, using original');
                return originalCode;
            }
            
            return extractedCode;
            
        } catch (error) {
            console.error('Error generating fixed code:', error);
            
            // Enhanced fallback with basic improvements
            return this.generateBasicFixedCode(originalCode, issues);
        }
    }

    // Generate basic fixed code as fallback
    generateBasicFixedCode(originalCode, issues) {
        let improvedCode = originalCode;
        
        // Apply basic formatting improvements
        improvedCode = improvedCode
            .replace(/\t/g, '    ')  // Replace tabs with 4 spaces
            .replace(/;\s*$/gm, '')   // Remove trailing semicolons
            .replace(/\s{2,}$/gm, '') // Remove trailing spaces
            .replace(/\n{3,}/g, '\n\n'); // Reduce multiple newlines
        
        // Add basic header comment
        const headerComment = `# Improved by CodeSage AI\n# Issues addressed: ${issues.length}\n# Key improvements: PEP8 compliance, readability, and best practices\n\n`;
        
        return headerComment + improvedCode;
    }

    // Generate AI-powered improvement suggestions
    async generateImprovementSuggestions(originalCode, analysis) {
        const prompt = `You are CodeSage, an expert programming mentor and learning path designer. Based on the code analysis below, create a personalized learning plan for the user to improve their coding skills.

ORIGINAL CODE:
\`\`\`python
${originalCode}
\`\`\`

CODE ANALYSIS:
• Overall Score: ${analysis.overallScore}/10
• Code Quality: ${analysis.codeQuality}
• Issues Found: ${analysis.issues.length}
• Key Areas for Improvement: ${analysis.issues.map(issue => issue.type).join(', ')}

DETAILED ISSUES:
${analysis.issues.map(issue => 
    `• ${issue.type} (${issue.severity}): ${issue.description}\n  Problem: ${issue.problem}\n  Fix: ${issue.fix}`
).join('\n\n')}

Create a comprehensive learning plan with the following sections:

**🎯 Immediate Actions (Next 1-2 Weeks)**
• 3-4 specific, actionable tasks to address the most critical issues
• Include practice exercises and mini-projects
• Focus on the highest severity issues first

**📚 Learning Resources**
• Recommended tutorials, articles, or documentation
• Specific chapters or sections to study
• Free and paid resource options

**🚀 Skill Development Plan (1-3 Months)**
• Progressive learning milestones
• Project ideas to practice new skills
• Concepts to master in order

**💡 Pro Tips**
• Best practices specific to the identified issues
• Common pitfalls to avoid
• Industry standards and conventions

**📝 Practice Exercises**
• 3-4 coding challenges targeting the weak areas
• Each exercise should have a clear learning objective
• Include difficulty progression

Format your response in a clear, structured way using markdown formatting. Make it encouraging, practical, and tailored to the user's current skill level based on the code analysis. Focus on actionable steps rather than theoretical concepts.`;

        try {
            const response = await fetch(`${this.apiUrl}?key=${this.getApiKey()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,  // Higher temperature for more creative suggestions
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(`Gemini API Error: ${data.error.message}`);
            }

            return data.candidates[0].content.parts[0].text;
            
        } catch (error) {
            console.error('Error generating improvement suggestions:', error);
            
            // Enhanced fallback suggestions
            return `**🎯 Immediate Actions (Next 1-2 Weeks)**
• **Focus on Code Quality**: Review and apply PEP8 guidelines to your code. Practice consistent indentation (4 spaces) and proper line length (79 characters max).
• **Add Error Handling**: Implement try-catch blocks for file operations, user input, and external API calls. This will make your code more robust.
• **Improve Variable Naming**: Use descriptive names that clearly indicate the purpose. Avoid single-letter variables except for loop counters.
• **Add Comments and Documentation**: Write docstrings for functions and add comments explaining complex logic.

**📚 Learning Resources**
• **Python PEP8 Style Guide**: [pep8.org](https://pep8.org/) - Official Python style guide
• **Clean Code by Robert C. Martin**: Essential reading for writing maintainable code
• **Real Python**: [realpython.com](https://realpython.com/) - Excellent tutorials and best practices
• **Python Documentation**: [docs.python.org](https://docs.python.org/) - Official documentation

**🚀 Skill Development Plan (1-3 Months)**
• **Month 1**: Master Python basics and PEP8 compliance. Build 2-3 small projects focusing on clean code.
• **Month 2**: Learn advanced error handling and debugging techniques. Work on a medium-sized project.
• **Month 3**: Study design patterns and best practices. Contribute to open-source projects.

**💡 Pro Tips**
• **Write Code for Humans**: Your code should be readable and understandable by others.
• **Test Your Code**: Write unit tests and test edge cases.
• **Use Version Control**: Learn Git and GitHub for better code management.
• **Code Review**: Participate in code reviews to learn from others.

**📝 Practice Exercises**
• **Exercise 1**: Refactor a poorly written function to follow PEP8 guidelines.
• **Exercise 2**: Add comprehensive error handling to a file processing script.
• **Exercise 3**: Create a small CLI application with proper documentation and comments.
• **Exercise 4**: Implement a simple algorithm with proper variable naming and structure.`;
        }
    }

    // Fallback explanation generator
    generateFallbackExplanation(issue) {
        const explanations = {
            "Style": {
                simple: "Code style is like handwriting rules - when everyone follows the same style, it's easier to read and understand!",
                analogy: "Think of it like organizing your room. When everything has its place, it's easy to find what you need.",
                tasks: [
                    "Practice consistent indentation (4 spaces)",
                    "Use descriptive variable names",
                    "Add comments to explain complex parts"
                ]
            },
            "Bug": {
                simple: "A bug is like a mistake in a recipe that makes your food taste wrong. In code, bugs make your program behave incorrectly.",
                analogy: "Imagine building with LEGOs - if you put the wrong piece in the wrong spot, your creation might fall apart!",
                tasks: [
                    "Test your code with different inputs",
                    "Add error checking for edge cases",
                    "Use print statements to debug problems"
                ]
            },
            "Security": {
                simple: "Security is like locking your diary - you don't want strangers reading your secrets!",
                analogy: "Think of your code like your house. You wouldn't leave the doors wide open with valuables inside.",
                tasks: [
                    "Never hardcode passwords or API keys",
                    "Validate user input before using it",
                    "Learn about environment variables"
                ]
            },
            "Efficiency": {
                simple: "Efficient code is like taking the shortest path home instead of walking in circles.",
                analogy: "Imagine finding a book in a library. You could check every book one by one (slow), or use the catalog system (fast).",
                tasks: [
                    "Learn about Big O notation",
                    "Practice using appropriate data structures",
                    "Avoid nested loops when possible"
                ]
            },
            "Readability": {
                simple: "Readable code is like writing a clear story that anyone can understand and enjoy.",
                analogy: "Good code is like clear directions - instead of 'go there, then turn', say 'walk 2 blocks north, then turn right'.",
                tasks: [
                    "Use meaningful variable and function names",
                    "Break long functions into smaller ones",
                    "Add comments to explain the 'why' behind your code"
                ]
            }
        };

        return explanations[issue.type] || explanations["Style"];
    }

    // Generate mentorship insights
    async generateMentorshipInsights(reviewHistory) {
        const prompt = `Based on this code review history, provide personalized mentorship insights:

Review History:
${JSON.stringify(reviewHistory, null, 2)}

Please provide:
1. Common recurring mistake patterns
2. Personalized learning recommendations
3. Suggested learning roadmap
4. Encouragement and next steps

Format your response as helpful, encouraging advice for someone learning to code.`;

        try {
            const response = await fetch(`${this.apiUrl}?key=${this.getApiKey()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                })
            });

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
            
        } catch (error) {
            console.error('Error generating mentorship insights:', error);
            return "Keep practicing! Every coder improves with time and experience.";
        }
    }

    // Generate personalized insights from user history
    async generatePersonalizedInsights(userHistory) {
        const prompt = `Analyze this user's code review history and provide personalized insights:

User History:
${JSON.stringify(userHistory, null, 2)}

Please provide a comprehensive analysis in JSON format with the following structure:
{
  "stats": {
    "totalReviews": number,
    "averageScore": number,
    "skillsImproved": number,
    "progress": string
  },
  "patterns": {
    "strengths": string[],
    "weaknesses": string[],
    "recurringIssues": string[]
  },
  "recommendations": {
    "immediateActions": string[],
    "learningGoals": string[],
    "practiceSuggestions": string[]
  },
  "insights": {
    "overallProgress": string,
    "areasForImprovement": string[],
    "encouragement": string
  }
}

Analyze the data and provide realistic, personalized insights based on the user's performance over time.`;

        try {
            const response = await fetch(`${this.apiUrl}?key=${this.getApiKey()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                })
            });

            const data = await response.json();
            const responseText = data.candidates[0].content.parts[0].text;
            
            // Try to parse JSON response
            try {
                return JSON.parse(responseText);
            } catch (parseError) {
                console.error('Error parsing JSON response:', parseError);
                // Return fallback insights
                return this.generateFallbackInsights(userHistory);
            }
            
        } catch (error) {
            console.error('Error generating personalized insights:', error);
            return this.generateFallbackInsights(userHistory);
        }
    }

    // Generate fallback insights
    generateFallbackInsights(userHistory) {
        const totalReviews = userHistory.length;
        const averageScore = userHistory.reduce((sum, review) => sum + review.score, 0) / totalReviews;
        
        return {
            stats: {
                totalReviews: totalReviews,
                averageScore: averageScore,
                skillsImproved: Math.floor(totalReviews * 0.6),
                progress: Math.min(95, Math.floor(averageScore * 10)) + '%'
            },
            patterns: {
                strengths: ['Consistent practice', 'Code submission'],
                weaknesses: ['Code style', 'Error handling'],
                recurringIssues: ['Style issues', 'Bug fixes']
            },
            recommendations: {
                immediateActions: [
                    'Focus on PEP8 compliance',
                    'Add comprehensive error handling',
                    'Practice code refactoring'
                ],
                learningGoals: [
                    'Master Python best practices',
                    'Learn advanced debugging techniques',
                    'Study design patterns'
                ],
                practiceSuggestions: [
                    'Review and refactor old code',
                    'Write unit tests for existing code',
                    'Participate in code reviews'
                ]
            },
            insights: {
                overallProgress: `You've made good progress with an average score of ${averageScore.toFixed(1)}. Keep practicing!`,
                areasForImprovement: [
                    'Code organization and structure',
                    'Error handling and edge cases',
                    'Documentation and comments'
                ],
                encouragement: 'Your dedication to improving your code is commendable. Every review brings you closer to mastery!'
            }
        };
    }
}

// Global instance
window.geminiAnalyzer = new GeminiCodeAnalyzer();

// Utility functions
window.showApiKeyModal = function() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-xl font-bold mb-4">Set Gemini API Key</h3>
            <p class="text-gray-600 mb-4">
                To use CodeSage with real AI, you need a Gemini API key. 
                <a href="https://makersuite.google.com/app/apikey" target="_blank" class="text-blue-600 underline">
                    Get your free API key here
                </a>
            </p>
            <input type="password" id="api-key-input" placeholder="Enter your API key" 
                   class="w-full p-3 border rounded-lg mb-4">
            <div class="flex space-x-3">
                <button onclick="saveApiKey()" class="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                    Save Key
                </button>
                <button onclick="closeApiKeyModal()" class="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">
                    Cancel
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.saveApiKey = function() {
    const apiKey = document.getElementById('api-key-input').value.trim();
    if (apiKey) {
        window.geminiAnalyzer.setApiKey(apiKey);
        closeApiKeyModal();
        alert('API key saved successfully!');
    } else {
        alert('Please enter a valid API key');
    }
};

window.closeApiKeyModal = function() {
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) {
        modal.remove();
    }
};
