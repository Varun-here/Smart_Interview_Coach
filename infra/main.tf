terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "network" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "sic-vpc"
  cidr = "10.0.0.0/16"
  azs  = ["${var.aws_region}a", "${var.aws_region}b"]

  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.3.0/24", "10.0.4.0/24"]

  enable_nat_gateway = true
}

resource "aws_s3_bucket" "audio" {
  bucket        = var.s3_bucket
  force_destroy = true
}

resource "aws_cognito_user_pool" "pool" {
  name                      = "sic-users"
  auto_verified_attributes  = ["email"]
  username_attributes       = ["email"]
}

resource "aws_cognito_user_pool_client" "client" {
  name                                = "sic-web"
  user_pool_id                        = aws_cognito_user_pool.pool.id
  generate_secret                     = false
  callback_urls                       = [var.cognito_callback_url]
  logout_urls                         = [var.cognito_logout_url]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                 = ["code"]
  allowed_oauth_scopes                = ["email", "openid", "profile"]
  supported_identity_providers        = ["COGNITO"]
}

resource "aws_db_subnet_group" "rds_sg" {
  name       = "sic-db-subnets"
  subnet_ids = module.network.private_subnets
}

resource "aws_security_group" "app" {
  name   = "sic-app-sg"
  vpc_id = module.network.vpc_id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db" {
  name   = "sic-db-sg"
  vpc_id = module.network.vpc_id
  ingress {
    description = "from app/lambda"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    security_groups = [aws_security_group.app.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "pg" {
  identifier              = "sic-pg"
  engine                  = "postgres"
  engine_version          = "16.3"
  instance_class          = "db.t4g.micro"
  allocated_storage       = 20
  username                = var.db_user
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.rds_sg.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  publicly_accessible     = false
  skip_final_snapshot     = true
}

resource "aws_secretsmanager_secret" "db" {
  name = "sic/db"
}

resource "aws_secretsmanager_secret_version" "dbv" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    host     = aws_db_instance.pg.address,
    port     = 5432,
    user     = var.db_user,
    password = var.db_password,
    dbname   = "sic"
  })
}

output "cognito_user_pool_id" { value = aws_cognito_user_pool.pool.id }
output "cognito_client_id"    { value = aws_cognito_user_pool_client.client.id }
output "rds_endpoint"         { value = aws_db_instance.pg.address }
output "s3_bucket"            { value = aws_s3_bucket.audio.bucket }
