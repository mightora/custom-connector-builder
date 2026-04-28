export const BLOCKS = [
  {
    id: 'text-input',
    name: 'Text Input',
    description: 'Read a text parameter from the request',
    category: 'Inputs',
    codeTemplate: 'var {varName} = input["{paramName}"]?.Value<string>() ?? "";'
  },
  {
    id: 'number-input',
    name: 'Number Input',
    description: 'Read a number parameter from the request',
    category: 'Inputs',
    codeTemplate: 'var {varName} = input["{paramName}"]?.Value<decimal>() ?? 0;'
  },
  {
    id: 'date-input',
    name: 'Date Input',
    description: 'Read a date parameter from the request',
    category: 'Inputs',
    codeTemplate: 'var {varName} = DateTime.Parse(input["{paramName}"]?.Value<string>() ?? DateTime.Now.ToString("o"));'
  },
  {
    id: 'validate-required',
    name: 'Validate Required',
    description: 'Return an error if a field is empty',
    category: 'Validation',
    codeTemplate: 'if (string.IsNullOrEmpty({varName})) { return new HttpResponseMessage(HttpStatusCode.BadRequest) { Content = CreateJsonContent("{\\"error\\": \\"{paramName} is required\\"}") }; }'
  },
  {
    id: 'validate-email',
    name: 'Validate Email',
    description: 'Return an error if the value is not a valid email address',
    category: 'Validation',
    codeTemplate: 'if (!System.Text.RegularExpressions.Regex.IsMatch({varName}, @"^[^@]+@[^@]+\\.[^@]+$")) { return new HttpResponseMessage(HttpStatusCode.BadRequest) { Content = CreateJsonContent("{\\"error\\": \\"{paramName} must be a valid email\\"}") }; }'
  },
  {
    id: 'text-to-upper',
    name: 'Text to Uppercase',
    description: 'Convert a text value to uppercase',
    category: 'Operations',
    codeTemplate: '{varName} = {varName}.ToUpper();'
  },
  {
    id: 'add-numbers',
    name: 'Add Numbers',
    description: 'Add two numbers together',
    category: 'Operations',
    codeTemplate: 'var sum = {varName1} + {varName2};'
  },
  {
    id: 'calculate-percentage',
    name: 'Calculate Percentage',
    description: 'Calculate a percentage of a value',
    category: 'Operations',
    codeTemplate: 'var percentage = {varName} * ({percentValue} / 100m);'
  },
  {
    id: 'format-currency',
    name: 'Format Currency',
    description: 'Format a decimal as a currency string',
    category: 'Operations',
    codeTemplate: 'var formatted = {varName}.ToString("C");'
  },
  {
    id: 'return-success',
    name: 'Return Success',
    description: 'Return a 200 OK response with a result object',
    category: 'Output',
    codeTemplate: 'var result = new JObject { ["message"] = "Success", ["value"] = {varName} };\nvar response = new HttpResponseMessage(HttpStatusCode.OK) { Content = CreateJsonContent(result.ToString()) };\nreturn response;'
  },
  {
    id: 'return-error',
    name: 'Return Error',
    description: 'Return a 400 Bad Request response with an error message',
    category: 'Output',
    codeTemplate: 'return new HttpResponseMessage(HttpStatusCode.BadRequest) { Content = CreateJsonContent("{\\"error\\": \\"{errorMessage}\\"}") };'
  }
]
