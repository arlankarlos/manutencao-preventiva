import React, { useEffect, useMemo, useState } from "react"; import { Card, CardContent } from "@/components/ui/card"; import { Button } from "@/components/ui/button"; import { Input } from "@/components/ui/input"; import { Textarea } from "@/components/ui/textarea"; import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; import { Badge } from "@/components/ui/badge"; import { CalendarDays, Copy, MessageCircle, Plus, Trash2, Bell, Search } from "lucide-react";

const STORAGE_KEY = "ac_maintenance_clients_v1"; const TEMPLATE_KEY = "ac_maintenance_message_template_v1";

const DEFAULT_TEMPLATE = Olá, {nome}! Tudo bem?\n\nAqui é o Técnico {tecnico}. Estou entrando em contato para lembrar que a próxima limpeza/manutenção do seu ar-condicionado está agendada para {data}.\n\nEndereço: {endereco}\nAparelhos: {aparelhos}\n\nAr limpo, respiração melhor. Posso confirmar sua visita?;

function addInterval(dateString, intervalType, intervalValue) { const date = new Date(dateString + "T12:00:00"); const value = Number(intervalValue || 0); if (intervalType === "weeks") date.setDate(date.getDate() + value * 7); if (intervalType === "months") date.setMonth(date.getMonth() + value); return date.toISOString().slice(0, 10); }

function formatDate(dateString) { if (!dateString) return ""; const [y, m, d] = dateString.split("-"); return ${d}/${m}/${y}; }

function onlyNumbers(value) { return String(value || "").replace(/\D/g, ""); }

function statusFor(dateString) { const today = new Date(); today.setHours(0, 0, 0, 0); const target = new Date(dateString + "T00:00:00"); const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24)); if (diff < 0) return { label: "Atrasado", tone: "destructive", days: diff }; if (diff === 0) return { label: "Hoje", tone: "default", days: diff }; if (diff <= 7) return { label: Em ${diff} dia(s), tone: "secondary", days: diff }; return { label: Em ${diff} dia(s), tone: "outline", days: diff }; }

function buildMessage(template, client, technicianName) { const aparelhos = client.appliances .map((item, index) => ${index + 1}. ${item.quantity}x ${item.model}) .join("; ");

return template .replaceAll("{nome}", client.name || "cliente") .replaceAll("{tecnico}", technicianName || "responsável") .replaceAll("{telefone}", client.phone || "") .replaceAll("{endereco}", client.address || "") .replaceAll("{data}", formatDate(client.nextVisitDate)) .replaceAll("{aparelhos}", aparelhos || "não informado"); }

export default function App() { const [technicianName, setTechnicianName] = useState("Tiago"); const [template, setTemplate] = useState(DEFAULT_TEMPLATE); const [clients, setClients] = useState([]); const [query, setQuery] = useState(""); const [copiedId, setCopiedId] = useState(null);

const [form, setForm] = useState({ name: "", phone: "", address: "", baseDate: new Date().toISOString().slice(0, 10), intervalType: "months", intervalValue: "6", appliances: [{ quantity: "1", model: "Split 9.000 BTUs" }], });

useEffect(() => { const savedClients = localStorage.getItem(STORAGE_KEY); const savedTemplate = localStorage.getItem(TEMPLATE_KEY); if (savedClients) setClients(JSON.parse(savedClients)); if (savedTemplate) setTemplate(savedTemplate); }, []);

useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(clients)); }, [clients]);

useEffect(() => { localStorage.setItem(TEMPLATE_KEY, template); }, [template]);

const nextVisitDate = useMemo(() => { return addInterval(form.baseDate, form.intervalType, form.intervalValue); }, [form.baseDate, form.intervalType, form.intervalValue]);

const filteredClients = useMemo(() => { const q = query.toLowerCase().trim(); return clients .filter((client) => { if (!q) return true; return [client.name, client.phone, client.address] .join(" ") .toLowerCase() .includes(q); }) .sort((a, b) => new Date(a.nextVisitDate) - new Date(b.nextVisitDate)); }, [clients, query]);

function updateAppliance(index, field, value) { setForm((prev) => ({ ...prev, appliances: prev.appliances.map((item, i) => i === index ? { ...item, [field]: value } : item ), })); }

function addAppliance() { setForm((prev) => ({ ...prev, appliances: [...prev.appliances, { quantity: "1", model: "" }], })); }

function removeAppliance(index) { setForm((prev) => ({ ...prev, appliances: prev.appliances.filter((_, i) => i !== index), })); }

function createClient() { if (!form.name.trim()) return alert("Informe o nome do cliente."); if (!form.phone.trim()) return alert("Informe o telefone do cliente.");

const client = {
  id: crypto.randomUUID(),
  name: form.name.trim(),
  phone: form.phone.trim(),
  address: form.address.trim(),
  baseDate: form.baseDate,
  intervalType: form.intervalType,
  intervalValue: form.intervalValue,
  nextVisitDate,
  appliances: form.appliances.filter((item) => item.model.trim()),
  createdAt: new Date().toISOString(),
};

setClients((prev) => [client, ...prev]);
setForm({
  name: "",
  phone: "",
  address: "",
  baseDate: new Date().toISOString().slice(0, 10),
  intervalType: "months",
  intervalValue: "6",
  appliances: [{ quantity: "1", model: "Split 9.000 BTUs" }],
});

}

function deleteClient(id) { setClients((prev) => prev.filter((client) => client.id !== id)); }

function renewVisit(client) { const newDate = addInterval(client.nextVisitDate, client.intervalType, client.intervalValue); setClients((prev) => prev.map((item) => item.id === client.id ? { ...item, baseDate: client.nextVisitDate, nextVisitDate: newDate } : item ) ); }

async function copyMessage(client) { const message = buildMessage(template, client, technicianName); await navigator.clipboard.writeText(message); setCopiedId(client.id); setTimeout(() => setCopiedId(null), 1600); }

function openWhatsApp(client) { const phone = onlyNumbers(client.phone); const message = encodeURIComponent(buildMessage(template, client, technicianName)); window.open(https://wa.me/55${phone}?text=${message}, "_blank"); }

return ( <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900"> <div className="mx-auto max-w-7xl space-y-6"> <header className="rounded-3xl bg-gradient-to-r from-blue-900 to-cyan-700 p-6 text-white shadow-lg"> <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"> <div> <h1 className="text-3xl md:text-4xl font-black tracking-tight">Agenda de Manutenção de Ar-Condicionado</h1> <p className="mt-2 text-blue-100">Cadastre clientes, aparelhos, próximas visitas e envie lembretes pelo WhatsApp.</p> </div> <div className="w-full md:w-72"> <label className="text-sm text-blue-100">Nome do técnico</label> <Input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} className="mt-1 bg-white text-slate-900" /> </div> </div> </header>

<div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card className="rounded-3xl shadow-sm">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Plus size={20}/> Novo cadastro</h2>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Nome do cliente</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Maria Silva" />
            </div>
            <div>
              <label className="text-sm font-medium">Telefone / WhatsApp</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="62 99106-2200" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Endereço</label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro, cidade" />
          </div>

          <div className="rounded-2xl border p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold">Aparelhos</h3>
              <Button variant="outline" size="sm" onClick={addAppliance}>Adicionar</Button>
            </div>
            {form.appliances.map((item, index) => (
              <div key={index} className="grid grid-cols-[80px_1fr_40px] gap-2 items-end">
                <div>
                  <label className="text-xs">Qtd.</label>
                  <Input value={item.quantity} onChange={(e) => updateAppliance(index, "quantity", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs">Modelo</label>
                  <Input value={item.model} onChange={(e) => updateAppliance(index, "model", e.target.value)} placeholder="Ex: Split 12.000 BTUs inverter" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeAppliance(index)} disabled={form.appliances.length === 1}>
                  <Trash2 size={18}/>
                </Button>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Última visita</label>
              <Input type="date" value={form.baseDate} onChange={(e) => setForm({ ...form, baseDate: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Repetir a cada</label>
              <Input type="number" min="1" value={form.intervalValue} onChange={(e) => setForm({ ...form, intervalValue: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Período</label>
              <Select value={form.intervalType} onValueChange={(value) => setForm({ ...form, intervalType: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weeks">Semanas</SelectItem>
                  <SelectItem value="months">Meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Data calculada da próxima visita</p>
              <p className="text-2xl font-black text-blue-950">{formatDate(nextVisitDate)}</p>
            </div>
            <CalendarDays className="text-blue-700" />
          </div>

          <Button className="w-full rounded-2xl text-base font-bold" onClick={createClient}>Salvar cliente</Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5 space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2"><MessageCircle size={20}/> Mensagem padrão do WhatsApp</h2>
            <p className="text-sm text-slate-500">Use: {"{nome}"}, {"{tecnico}"}, {"{telefone}"}, {"{endereco}"}, {"{data}"}, {"{aparelhos}"}</p>
            <Textarea className="min-h-36" value={template} onChange={(e) => setTemplate(e.target.value)} />
            <Button variant="outline" onClick={() => setTemplate(DEFAULT_TEMPLATE)}>Restaurar padrão</Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2"><Bell size={20}/> Alarmes e próximas visitas</h2>
              <div className="relative md:w-80">
                <Search className="absolute left-3 top-3 text-slate-400" size={17}/>
                <Input className="pl-9" placeholder="Buscar cliente, telefone ou endereço" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>

            {filteredClients.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">Nenhum cliente cadastrado ainda.</div>
            ) : (
              <div className="space-y-3">
                {filteredClients.map((client) => {
                  const status = statusFor(client.nextVisitDate);
                  const message = buildMessage(template, client, technicianName);
                  return (
                    <div key={client.id} className="rounded-2xl border bg-white p-4 space-y-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-black">{client.name}</h3>
                            <Badge variant={status.tone}>{status.label}</Badge>
                          </div>
                          <p className="text-sm text-slate-500">{client.phone}</p>
                          <p className="text-sm text-slate-500">{client.address}</p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-sm text-slate-500">Próxima visita</p>
                          <p className="text-xl font-black text-blue-900">{formatDate(client.nextVisitDate)}</p>
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3 text-sm">
                        <strong>Aparelhos:</strong> {client.appliances.map((a) => `${a.quantity}x ${a.model}`).join(" | ") || "Não informado"}
                      </div>

                      <details className="rounded-xl bg-green-50 p-3 text-sm whitespace-pre-wrap">
                        <summary className="cursor-pointer font-bold text-green-900">Ver mensagem pronta</summary>
                        <div className="mt-2">{message}</div>
                      </details>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => copyMessage(client)}>
                          <Copy size={16} className="mr-2"/> {copiedId === client.id ? "Copiado!" : "Copiar mensagem"}
                        </Button>
                        <Button onClick={() => openWhatsApp(client)}>
                          <MessageCircle size={16} className="mr-2"/> Abrir WhatsApp
                        </Button>
                        <Button variant="secondary" onClick={() => renewVisit(client)}>Marcar como visitado e reagendar</Button>
                        <Button variant="ghost" onClick={() => deleteClient(client.id)}>
                          <Trash2 size={16} className="mr-2"/> Excluir
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</div>

); }
