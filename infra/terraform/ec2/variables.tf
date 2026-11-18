variable "aws_region" {
  description = "Región de AWS para el despliegue."
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "Nombre del perfil local de AWS CLI (opcional). Si está vacío usa la cadena estándar de credenciales."
  type        = string
  default     = ""
}

variable "project_name" {
  description = "Prefijo de nombres y etiqueta del entorno."
  type        = string
  default     = "ecommerce-k3s"
}

variable "vpc_cidr" {
  description = "Rango IPv4 privado de la VPC dedicada."
  type        = string
  default     = "10.42.0.0/16"
}

variable "public_subnet_cidr" {
  description = "Rango IPv4 de la única subred pública."
  type        = string
  default     = "10.42.1.0/24"
}

variable "instance_type" {
  description = "Tipo de instancia EC2 (t3.small mínimo: 2 GB RAM para k3s + 2 BDs + 3 pods)."
  type        = string
  default     = "t3.small"
}

variable "root_volume_size" {
  description = "Tamaño del volumen raíz gp3 cifrado, en GiB."
  type        = number
  default     = 30

  validation {
    condition     = var.root_volume_size >= 30
    error_message = "El volumen raíz debe tener al menos 30 GiB."
  }
}

variable "allowed_http_cidr" {
  description = "CIDR IPv4 autorizado a acceder al sitio (HTTP/HTTPS). El default publica en Internet."
  type        = string
  default     = "0.0.0.0/0"

  validation {
    condition     = can(cidrhost(var.allowed_http_cidr, 0))
    error_message = "allowed_http_cidr debe ser un bloque CIDR IPv4 válido."
  }
}

variable "allowed_k8s_api_cidr" {
  description = "CIDR IPv4 opcional autorizado a acceder a la API de k3s (puerto 6443). Vacío por defecto (puerto cerrado)."
  type        = string
  default     = ""

  validation {
    condition     = var.allowed_k8s_api_cidr == "" || can(cidrhost(var.allowed_k8s_api_cidr, 0))
    error_message = "allowed_k8s_api_cidr debe estar vacío o ser un bloque CIDR IPv4 válido."
  }
}

variable "k3s_version" {
  description = "Versión de k3s a instalar en la instancia EC2."
  type        = string
  default     = "v1.31.4+k3s1"

  validation {
    condition     = length(trimspace(var.k3s_version)) > 0
    error_message = "k3s_version no puede estar vacío."
  }
}
