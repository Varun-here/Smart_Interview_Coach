variable "aws_region"           { type = string, default = "us-east-1" }
variable "s3_bucket"            { type = string }
variable "db_user"              { type = string }
variable "db_password"          { type = string }
variable "cognito_callback_url" { type = string }
variable "cognito_logout_url"   { type = string }
