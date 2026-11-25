
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "grocery-store"
}

variable "location" {
  description = "Azure region for project resources"
  type        = string
  default     = "northeurope"
}

variable "mongodb_uri" {
  description = "MongoDB Atlas connection string"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}