%dw 2.0
output application/json
---
{
  message: error.detailedDescription default "Unexpected error",
  correlationId: correlationId
}
