resource "azurerm_container_app_environment" "main" {
  name                       = "${var.project_name}-env"
  location                   = var.location
  resource_group_name        = azurerm_resource_group.main.name
  logs_destination           = "log-analytics"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }
}


resource "azurerm_container_app" "main" {
  name                         = "${var.project_name}-app"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "grocery-store-api"
      image  = "ghcr.io/filipovicirena/grocery-store-api:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name        = "MONGODB_URI"
        secret_name = "mongodb-uri"
      }

      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }
    }
  }

  secret {
    name  = "mongodb-uri"
    value = var.mongodb_uri
  }

  secret {
    name  = "jwt-secret"
    value = var.jwt_secret
  }

  ingress {
    external_enabled           = true
    allow_insecure_connections = false
    target_port                = 3000
    transport                  = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}
