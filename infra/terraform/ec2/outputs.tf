output "public_ip" {
  description = "Elastic IP pública de la instancia EC2 con k3s."
  value       = aws_eip.app.public_ip
}

output "url" {
  description = "URL HTTP principal expuesta por Traefik Ingress."
  value       = "http://${aws_eip.app.public_ip}"
}

output "instance_id" {
  description = "ID de la instancia EC2 para Session Manager (SSM)."
  value       = aws_instance.app.id
}

output "aws_region" {
  description = "Región AWS donde se creó la infraestructura."
  value       = var.aws_region
}

output "ssm_connect_command" {
  description = "Comando AWS CLI para abrir sesión administrativa vía SSM."
  value       = "aws ssm start-session --target ${aws_instance.app.id} --region ${var.aws_region}"
}
