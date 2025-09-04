import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, CheckCircle, Paperclip, Clock, UserCheck, X, MessageSquare } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SimpleFileUploader } from "@/components/SimpleFileUploader";
import { RealTimeTimer } from "@/components/real-time-timer";
import type { TicketWithDetails } from "@shared/schema";

interface TicketDetailsModalProps {
  ticket: TicketWithDetails;
  isOpen: boolean;
  onClose: () => void;
  userRole: "user" | "technician" | "admin";
  currentUserId?: string;
}

export function TicketDetailsModal({
  ticket,
  isOpen,
  onClose,
  userRole = "user",
  currentUserId
}: TicketDetailsModalProps) {
  const [newComment, setNewComment] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [pendingPriority, setPendingPriority] = useState<string>("");
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // Fetch latest ticket data when modal is open
  const { data: latestTicket } = useQuery<TicketWithDetails>({
    queryKey: ["/api/tickets", ticket.id],
    enabled: isOpen, // Only fetch when modal is open
    refetchInterval: 2000, // Refetch every 2 seconds when modal is open for real-time updates
  });

  // Fetch ticket attachments
  const { data: ticketAttachments = [] } = useQuery({
    queryKey: ["/api/tickets", ticket.ticketNumber, "attachments"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/tickets/${ticket.ticketNumber}/attachments`);
      return response.json();
    },
    enabled: isOpen,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Use latest ticket data if available, fallback to prop
  const currentTicket = latestTicket || ticket;

  // Update pending values when ticket data changes
  useEffect(() => {
    if (currentTicket) {
      setPendingPriority(currentTicket.priority);
      setPendingStatus(currentTicket.status);
      setHasChanges(false);
    }
  }, [currentTicket]);

  // Clear form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setNewComment("");
      setAttachments([]);
      setHasChanges(false);
    }
  }, [isOpen]);

  // Fetch technicians for assignment
  const { data: technicians } = useQuery({
    queryKey: ["/api/technicians"],
    enabled: userRole !== "user",
  });

  const addCommentMutation = useMutation({
    mutationFn: async (commentData: any) => {
      const response = await apiRequest("POST", "/api/comments", commentData);
      return response.json();
    },
    onSuccess: () => {
      setNewComment("");
      setAttachments([]);
      toast({
        title: "Sucesso",
        description: "Comentário adicionado com sucesso!",
      });
      // Invalidate and refetch tickets data to update comments immediately
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticket.ticketNumber, "attachments"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar comentário",
        variant: "destructive",
      });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async (priority: string) => {
      const response = await apiRequest("PATCH", `/api/tickets/${ticket.id}/priority`, { priority });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Prioridade atualizada com sucesso!",
      });
      // Invalidate and refetch tickets data
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tickets", currentUserId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar prioridade",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PATCH", `/api/tickets/${ticket.id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso!",
      });
      // Invalidate and refetch tickets data
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tickets", currentUserId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (technicianId: string) => {
      const response = await apiRequest("PATCH", `/api/tickets/${ticket.id}/assign`, { technicianId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Chamado atribuído com sucesso!",
      });
      // Invalidate and refetch tickets data
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tickets", currentUserId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atribuir chamado",
        variant: "destructive",
      });
    },
  });

  const resolveTicketMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/tickets/${ticket.id}/status`, { status: "resolved" });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Chamado marcado como resolvido!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tickets", currentUserId] });
      }
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao marcar chamado como resolvido",
        variant: "destructive",
      });
    },
  });

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const authorName = userRole === "user" ? (currentTicket.userEmail || "Usuário") :
                       userRole === "technician" ? "Técnico" : "Administrador";

      addCommentMutation.mutate({
        ticketId: ticket.id,
        content: newComment,
        authorName,
        authorType: userRole,
        attachments: attachments, // Usar apenas os anexos já enviados via SimpleFileUploader
      });
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar comentário",
        variant: "destructive",
      });
    }
  };


  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-500 text-white">Alta</Badge>;
      case "medium":
        return <Badge className="bg-orange-500 text-white">Média</Badge>;
      case "low":
        return <Badge className="bg-yellow-500 text-white">Baixa</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="outline">Aberto</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500 text-white">Em Andamento</Badge>;
      case "resolved":
        return <Badge className="bg-green-500 text-white">Resolvido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handlePriorityChange = (priority: string) => {
    setPendingPriority(priority);
    setHasChanges(priority !== currentTicket.priority || pendingStatus !== currentTicket.status);
  };

  const handleStatusChange = (status: string) => {
    setPendingStatus(status);
    setHasChanges(status !== currentTicket.status || pendingPriority !== currentTicket.priority);
  };

  const handleApplyChanges = () => {
    if (pendingPriority !== currentTicket.priority) {
      updatePriorityMutation.mutate(pendingPriority);
    }
    if (pendingStatus !== currentTicket.status) {
      updateStatusMutation.mutate(pendingStatus);
    }
    setHasChanges(false);
  };

  const handleAssignChange = (technicianId: string) => {
    const actualTechnicianId = technicianId === "unassigned" ? "" : technicianId;
    assignMutation.mutate(actualTechnicianId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="ticket-details-description">
        <DialogHeader>
          <DialogTitle>
            Chamado #{currentTicket.ticketNumber} - {currentTicket.title}
          </DialogTitle>
          <div id="ticket-details-description" className="sr-only">
            Visualize e gerencie os detalhes do chamado, incluindo status, prioridade e comentários.
          </div>
          <div className="flex gap-2">
              {getPriorityBadge(currentTicket.priority)}
              {getStatusBadge(currentTicket.status)}
            </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Ticket Info */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações do Chamado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  {getStatusBadge(currentTicket.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prioridade:</span>
                  {getPriorityBadge(currentTicket.priority)}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Setor:</span>
                  <span>{currentTicket.sector}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span>{currentTicket.problemType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Solicitante:</span>
                  <span>{currentTicket.requesterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{currentTicket.userEmail || "Não informado"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Responsável:</span>
                  <span>{currentTicket.assignedTo?.name || "Não atribuído"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aberto em:</span>
                  <span>{new Date(currentTicket.createdAt).toLocaleString('pt-BR')}</span>
                </div>

                {/* Timing Information */}
                <Separator className="my-3" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Tempos de Atendimento</span>
                  </div>

                  {/* Time waiting for acceptance */}
                  {currentTicket.status === 'open' && (
                    <RealTimeTimer
                      startTime={new Date(currentTicket.createdAt).toISOString()}
                      label="Aguardando aceitação"
                      className="text-orange-600"
                    />
                  )}

                  {/* Time to accept (completed) */}
                  {currentTicket.acceptedAt && (
                    <div className="text-sm">
                      <span className="font-medium">Tempo até aceitação:</span>{" "}
                      <span className="text-green-600">
                        {(() => {
                          const diffMs = new Date(currentTicket.acceptedAt).getTime() - new Date(currentTicket.createdAt).getTime();
                          const hours = Math.floor(diffMs / (1000 * 60 * 60));
                          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                          return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                        })()}
                      </span>
                    </div>
                  )}

                  {/* Time in progress */}
                  {currentTicket.status === 'in_progress' && currentTicket.acceptedAt && (
                    <RealTimeTimer
                      startTime={new Date(currentTicket.acceptedAt).toISOString()}
                      label="Em andamento há"
                      className="text-blue-600"
                    />
                  )}

                  {/* Resolution time (completed) */}
                  {currentTicket.resolvedAt && currentTicket.acceptedAt && (
                    <div className="text-sm">
                      <span className="font-medium">Tempo de resolução:</span>{" "}
                      <span className="text-green-600">
                        {(() => {
                          const diffMs = new Date(currentTicket.resolvedAt).getTime() - new Date(currentTicket.acceptedAt).getTime();
                          const hours = Math.floor(diffMs / (1000 * 60 * 60));
                          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                          return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                        })()}
                      </span>
                    </div>
                  )}

                  {/* Total time (completed tickets) */}
                  {currentTicket.resolvedAt && (
                    <div className="text-sm">
                      <span className="font-medium">Tempo total:</span>{" "}
                      <span className="text-purple-600">
                        {(() => {
                          const diffMs = new Date(currentTicket.resolvedAt).getTime() - new Date(currentTicket.createdAt).getTime();
                          const hours = Math.floor(diffMs / (1000 * 60 * 60));
                          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                          return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions Section - Only for technicians and admins with restrictions */}
            {userRole !== "user" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Ações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Only allow changes if ticket is not resolved, or if user is admin */}
                    {(currentTicket.status !== 'resolved' || userRole === 'admin') && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Prioridade</label>
                          <Select
                            value={pendingPriority}
                            onValueChange={handlePriorityChange}
                            disabled={updatePriorityMutation.isPending || (currentTicket.status === 'resolved' && userRole !== 'admin')}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="waiting">Aguardando</SelectItem>
                              <SelectItem value="low">Baixa</SelectItem>
                              <SelectItem value="medium">Média</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Status</label>
                          <Select
                            value={pendingStatus}
                            onValueChange={handleStatusChange}
                            disabled={updateStatusMutation.isPending || (currentTicket.status === 'resolved' && userRole !== 'admin')}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Aberto</SelectItem>
                              <SelectItem value="in_progress">Em Andamento</SelectItem>
                              <SelectItem value="resolved">Resolvido</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {/* Apply Changes Button */}
                    {hasChanges && (
                      <Button
                        onClick={handleApplyChanges}
                        disabled={updatePriorityMutation.isPending || updateStatusMutation.isPending}
                        className="w-full"
                      >
                        {(updatePriorityMutation.isPending || updateStatusMutation.isPending) ? "Aplicando..." : "Aplicar Alterações"}
                      </Button>
                    )}

                    {/* This button should be "Assumir Chamado" and only appear if the ticket is open and not assigned, or if the current user is the assignee */}
                    {currentTicket.status === 'open' && currentTicket.assignedTo?.id !== currentUserId && (
                      <Button
                        onClick={() => assignMutation.mutate(currentUserId!)}
                        className="w-full"
                        disabled={assignMutation.isPending}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        {assignMutation.isPending ? "Assumindo..." : "Assumir Chamado"}
                      </Button>
                    )}


                    {/* Show info message for resolved tickets */}
                    {currentTicket.status === 'resolved' && userRole !== 'admin' && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          Este chamado foi resolvido e não pode mais ser modificado. Apenas administradores podem fazer alterações.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Descrição do Problema</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {currentTicket.description}
                </p>

                {/* Show ticket attachments */}
                {ticketAttachments && ticketAttachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Anexos do chamado #{currentTicket.ticketNumber}:</p>
                    {ticketAttachments.map((attachment: any, index: number) => {
                      const canDownload = userRole === 'technician' || userRole === 'admin';

                      if (canDownload) {
                        const handleDownload = async () => {
                          try {
                            const response = await fetch(attachment.url, {
                              headers: {
                                'x-user-role': userRole
                              }
                            });

                            if (!response.ok) {
                              throw new Error('Erro no download');
                            }

                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = attachment.originalName || `anexo-chamado-${index + 1}`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch (error) {
                            toast({
                              title: 'Erro',
                              description: 'Erro ao fazer download do arquivo',
                              variant: 'destructive'
                            });
                          }
                        };

                        return (
                          <button
                            key={index}
                            onClick={handleDownload}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                            data-testid={`button-download-ticket-attachment-${index}`}
                          >
                            <Paperclip className="h-3 w-3" />
                            {attachment.originalName || `Anexo ${index + 1}`}
                            <span className="text-xs text-gray-500">
                              ({(attachment.size / 1024).toFixed(1)} KB)
                            </span>
                          </button>
                        );
                      } else {
                        return (
                          <span key={index} className="text-sm text-gray-600 flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {attachment.originalName || `Anexo ${index + 1}`} (Disponível para técnicos)
                          </span>
                        );
                      }
                    })}
                  </div>
                )}

                {/* Show legacy attachments if any */}
                {currentTicket.attachments && currentTicket.attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Anexos legados:</p>
                    {currentTicket.attachments.map((attachment, index) => {
                      // Verificar se é um URL do novo sistema (/api/files/...)
                      const isNewSystem = attachment.startsWith('/api/files/');
                      const canDownload = userRole === 'technician' || userRole === 'admin';

                      if (isNewSystem && canDownload) {
                        const handleDownload = async () => {
                          try {
                            const response = await fetch(attachment, {
                              headers: {
                                'x-user-role': userRole
                              }
                            });

                            if (!response.ok) {
                              throw new Error('Erro no download');
                            }

                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `anexo-legado-${index + 1}`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch (error) {
                            toast({
                              title: 'Erro',
                              description: 'Erro ao fazer download do arquivo',
                              variant: 'destructive'
                            });
                          }
                        };

                        return (
                          <button
                            key={index}
                            onClick={handleDownload}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                            data-testid={`button-download-ticket-attachment-${index}`}
                          >
                            <Paperclip className="h-3 w-3" />
                            Download Anexo Legado {index + 1}
                          </button>
                        );
                      } else if (isNewSystem) {
                        return (
                          <span key={index} className="text-sm text-gray-600 flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            Anexo Legado {index + 1} (Disponível para técnicos)
                          </span>
                        );
                      } else {
                        // Sistema antigo - manter compatibilidade
                        return (
                          <a
                            key={index}
                            href={attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Paperclip className="h-3 w-3" />
                            Anexo Legado {index + 1}
                          </a>
                        );
                      }
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Comments Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Comentários e Atualizações</h3>

          {currentTicket.comments && currentTicket.comments.length > 0 ? (
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {currentTicket.comments.map((comment) => (
                <Card
                  key={comment.id}
                  className={comment.authorType === "user" ? "comment-card-user" : "comment-card-tech"}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">
                        {comment.authorName} ({comment.authorType === "user" ? "Usuário" : "Técnico"})
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {comment.attachments.map((attachment, index) => {
                          // Verificar se é um URL do novo sistema (/api/files/...)
                          const isNewSystem = attachment.startsWith('/api/files/');
                          const canDownload = userRole === 'technician' || userRole === 'admin';

                          // Extrair informações do arquivo do nome
                          const getFileInfoFromUrl = (url: string) => {
                            const filename = url.split('/').pop() || '';
                            // Função para extrair extensão sem usar módulo path do Node.js
                            const getFileExtension = (filename: string) => {
                              const lastDot = filename.lastIndexOf('.');
                              return lastDot > 0 ? filename.substring(lastDot) : '';
                            };
                            const extension = getFileExtension(filename);
                            const getFileType = (ext: string) => {
                              const e = ext.toLowerCase();
                              if (['.jpg', '.jpeg', '.png', '.gif'].includes(e)) return 'image';
                              if (['.pdf'].includes(e)) return 'pdf';
                              if (['.doc', '.docx'].includes(e)) return 'document';
                              if (['.txt'].includes(e)) return 'text';
                              if (['.zip', '.rar', '.7z'].includes(e)) return 'archive';
                              return 'unknown';
                            };

                            const getFileIcon = (type: string) => {
                              switch (type) {
                                case 'image': return '🖼️';
                                case 'pdf': return '📄';
                                case 'document': return '📝';
                                case 'text': return '📄';
                                case 'archive': return '🗜️';
                                default: return '📎';
                              }
                            };

                            return {
                              extension,
                              fileType: getFileType(extension),
                              icon: getFileIcon(getFileType(extension)),
                              filename
                            };
                          };

                          if (isNewSystem && canDownload) {
                            const fileInfo = getFileInfoFromUrl(attachment);

                            const handleDownload = async () => {
                              try {
                                const response = await fetch(attachment, {
                                  headers: {
                                    'x-user-role': userRole
                                  }
                                });

                                if (!response.ok) {
                                  throw new Error('Erro no download');
                                }

                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `anexo-comentario-${index + 1}${fileInfo.extension}`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } catch (error) {
                                toast({
                                  title: 'Erro',
                                  description: 'Erro ao fazer download do arquivo',
                                  variant: 'destructive'
                                });
                              }
                            };

                            return (
                              <button
                                key={index}
                                onClick={handleDownload}
                                className="text-sm text-primary hover:underline flex items-center gap-2"
                                data-testid={`button-download-attachment-${index}`}
                              >
                                <span>{fileInfo.icon}</span>
                                <span>Anexo {index + 1} ({fileInfo.fileType?.toUpperCase()})</span>
                              </button>
                            );
                          } else if (isNewSystem) {
                            const fileInfo = getFileInfoFromUrl(attachment);
                            return (
                              <span key={index} className="text-sm text-gray-600 flex items-center gap-2">
                                <span>{fileInfo.icon}</span>
                                <span>Anexo {index + 1} ({fileInfo.fileType?.toUpperCase()}) - Disponível para técnicos</span>
                              </span>
                            );
                          } else {
                            // Sistema antigo - manter compatibilidade
                            return (
                              <a
                                key={index}
                                href={attachment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                              >
                                <Paperclip className="h-3 w-3" />
                                Anexo Legado {index + 1}
                              </a>
                            );
                          }
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Nenhum comentário ainda
            </p>
          )}

          {/* Add Comment */}
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium">Adicionar Comentário</h4>
            {(() => {
              // User can only comment if ticket is still open
              const canUserComment = userRole === "user" && currentTicket.status === 'open';
              // Technicians and admins can comment unless ticket is resolved (only admin can comment on resolved)
              const canTechComment = userRole !== "user" && (currentTicket.status !== 'resolved' || userRole === 'admin');
              const canComment = userRole === "user" ? canUserComment : canTechComment;

              if (!canComment) {
                return (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-600">
                      {userRole === "user"
                        ? "Você não pode mais adicionar comentários após o chamado ser aceito por um técnico."
                        : "Este chamado foi resolvido e não aceita mais comentários. Apenas administradores podem comentar em chamados resolvidos."
                      }
                    </p>
                  </div>
                );
              }

              return (
                <>
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Digite seu comentário..."
                    className="min-h-20"
                    data-testid="textarea-new-comment"
                  />

                  {/* File Upload */}
                  <div className="space-y-2">
                    <SimpleFileUploader
                      onUploadComplete={(uploadedFiles) => {
                        // Adicionar URLs dos arquivos enviados aos anexos
                        const urls = uploadedFiles.map(file => file.url);
                        setAttachments(prev => [...prev, ...urls]);
                      }}
                      maxFiles={5}
                      maxFileSize={10485760}
                      buttonText="Anexar Arquivo"
                      buttonClassName="text-sm"
                      showConfirmButton={true}
                      uploadEndpoint={`/api/upload/${currentTicket.ticketNumber}`}
                    />

                    {/* Show attached files */}
                    {attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-medium">Arquivos anexados:</p>
                        {attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                            <span>Anexo {index + 1}</span>
                            <button
                              type="button"
                              onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-700 ml-auto"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    data-testid="button-add-comment"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {addCommentMutation.isPending ? "Enviando..." : "Enviar Comentário"}
                  </Button>
                </>
              );
            })()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}