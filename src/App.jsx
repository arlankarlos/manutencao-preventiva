import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  Copy,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  Wrench,
  RotateCcw,
} from "lucide-react";

const STORAGE_KEY = "manutencao_preventiva_clientes_v1";
const TEMPLATE_KEY = "manutencao_preventiva_template_v1";

const DEFAULT_TEMPLATE = `Olá, {nome}! Tudo bem?

Aqui é o Técnico {tecnico}. Estou entrando em contato para lembrar que sua próxima manutenção preventiva está agendada para {data}.

Endereço: {endereco}
Itens/equipamentos: {itens}

Podemos confirmar sua visita?`;

function addInterval(dateString, intervalType, intervalValue) {
  const date = new Date(dateString + "T12:00:00");
  const value = Number(intervalValue || 1);

  if (intervalType === "weeks") {
    date.setDate(date.getDate() + value * 7);
  }

  if (intervalType === "months") {
    date.setMonth(date.getMonth() + value);
  }

  return date.toISOString().slice(0, 10);
}

function formatDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function getVisitStatus(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateString + "T00:00:00");
  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `Atrasado há ${Math.abs(diffDays)} dia(s)`,
      className: "bg-red-100 text-red-700 border-red-200",
      priority: 0,
    };
  }

  if (diffDays === 0) {
    return {
      label: "Hoje",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      priority: 1,
    };
  }

  if (diffDays <= 7) {
    return {
      label: `Em ${diffDays} dia(s)`,
      className: "bg-orange-100 text-orange-700 border-orange-200",
      priority: 2,
    };
  }

  return {
    label: `Em ${diffDays} dia(s)`,
    className: "bg-blue-100 text-blue-700 border-blue-200",
    priority: 3,
  };
}

function buildMessage(template, client, technicianName) {
  const itens = client.items
    .map((item, index) => `${index + 1}. ${item.quantity}x ${item.model}`)
    .join("; ");

  return template
    .replaceAll("{nome}", client.name || "cliente")
    .replaceAll("{tecnico}", technicianName || "responsável")
    .replaceAll("{telefone}", client.phone || "")
    .replaceAll("{endereco}", client.address || "")
    .replaceAll("{data}", formatDate(client.nextVisitDate))
    .replaceAll("{itens}", itens || "não informado")
    .replaceAll("{aparelhos}", itens || "não informado");
}

export default function App() {
  const [technicianName, setTechnicianName] = useState("Tiago");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    baseDate: new Date().toISOString().slice(0, 10),
    intervalType: "months",
    intervalValue: "6",
    items: [{ quantity: "1", model: "Ar-condicionado Split 9.000 BTUs" }],
  });

  useEffect(() => {
    const savedClients = localStorage.getItem(STORAGE_KEY);
    const savedTemplate = localStorage.getItem(TEMPLATE_KEY);

    if (savedClients) {
      setClients(JSON.parse(savedClients));
    }

    if (savedTemplate) {
      setTemplate(savedTemplate);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem(TEMPLATE_KEY, template);
  }, [template]);

  const nextVisitDate = useMemo(() => {
    return addInterval(form.baseDate, form.intervalType, form.intervalValue);
  }, [form.baseDate, form.intervalType, form.intervalValue]);

  const filteredClients = useMemo(() => {
    const search = query.toLowerCase().trim();

    return clients
      .filter((client) => {
        if (!search) return true;

        return [
          client.name,
          client.phone,
          client.address,
          client.items.map((item) => item.model).join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => {
        const statusA = getVisitStatus(a.nextVisitDate);
        const statusB = getVisitStatus(b.nextVisitDate);

        if (statusA.priority !== statusB.priority) {
          return statusA.priority - statusB.priority;
        }

        return new Date(a.nextVisitDate) - new Date(b.nextVisitDate);
      });
  }, [clients, query]);

  function updateItem(index, field, value) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { quantity: "1", model: "" }],
    }));
  }

  function removeItem(index) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function createClient() {
    if (!form.name.trim()) {
      alert("Informe o nome do cliente.");
      return;
    }

    if (!form.phone.trim()) {
      alert("Informe o telefone do cliente.");
      return;
    }

    const validItems = form.items.filter((item) => item.model.trim());

    const newClient = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      baseDate: form.baseDate,
      intervalType: form.intervalType,
      intervalValue: form.intervalValue,
      nextVisitDate,
      items: validItems.length
        ? validItems
        : [{ quantity: "1", model: "Item não informado" }],
      createdAt: new Date().toISOString(),
    };

    setClients((prev) => [newClient, ...prev]);

    setForm({
      name: "",
      phone: "",
      address: "",
      baseDate: new Date().toISOString().slice(0, 10),
      intervalType: "months",
      intervalValue: "6",
      items: [{ quantity: "1", model: "Ar-condicionado Split 9.000 BTUs" }],
    });
  }

  function deleteClient(id) {
    const confirmDelete = window.confirm("Deseja excluir este cliente?");
    if (!confirmDelete) return;

    setClients((prev) => prev.filter((client) => client.id !== id));
  }

  function renewVisit(client) {
    const newDate = addInterval(
      client.nextVisitDate,
      client.intervalType,
      client.intervalValue
    );

    setClients((prev) =>
      prev.map((item) =>
        item.id === client.id
          ? {
              ...item,
              baseDate: client.nextVisitDate,
              nextVisitDate: newDate,
            }
          : item
      )
    );
  }

  async function copyMessage(client) {
    const message = buildMessage(template, client, technicianName);

    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(client.id);

      setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    } catch {
      alert("Não foi possível copiar a mensagem.");
    }
  }

  function openWhatsApp(client) {
    const phone = onlyNumbers(client.phone);
    const message = encodeURIComponent(
      buildMessage(template, client, technicianName)
    );

    if (!phone) {
      alert("Telefone inválido.");
      return;
    }

    window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <header className="mb-6 rounded-3xl bg-gradient-to-r from-blue-950 via-blue-800 to-cyan-700 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                <Wrench size={16} />
                Manutenção Preventiva
              </div>

              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Agenda de Manutenção
              </h1>

              <p className="mt-3 max-w-2xl text-blue-100">
                Cadastre clientes, controle visitas recorrentes e envie lembretes
                prontos pelo WhatsApp.
              </p>
            </div>

            <div className="w-full md:w-80">
              <label className="mb-1 block text-sm font-semibold text-blue-100">
                Nome do técnico
              </label>
              <input
                value={technicianName}
                onChange={(event) => setTechnicianName(event.target.value)}
                className="w-full rounded-2xl border border-white/20 bg-white px-4 py-3 text-slate-900 outline-none ring-blue-300 focus:ring-4"
                placeholder="Ex: Tiago"
              />
            </div>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black">Novo cadastro</h2>
                <p className="text-sm text-slate-500">
                  Registre cliente, equipamentos e recorrência.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Nome do cliente
                  </label>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    className="w-full rounded-2xl border px-4 py-3 outline-none ring-blue-200 focus:ring-4"
                    placeholder="Ex: Maria Silva"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Telefone / WhatsApp
                  </label>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                    className="w-full rounded-2xl border px-4 py-3 outline-none ring-blue-200 focus:ring-4"
                    placeholder="Ex: 62 99106-2200"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Endereço
                </label>
                <input
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                  className="w-full rounded-2xl border px-4 py-3 outline-none ring-blue-200 focus:ring-4"
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>

              <div className="rounded-3xl border bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black">Itens / equipamentos</h3>
                    <p className="text-sm text-slate-500">
                      Ex: ar-condicionado, bomba, filtro, motor, equipamento.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addItem}
                    className="rounded-2xl border bg-white px-4 py-2 text-sm font-bold hover:bg-slate-100"
                  >
                    Adicionar
                  </button>
                </div>

                <div className="space-y-3">
                  {form.items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[80px_1fr_42px] items-end gap-2"
                    >
                      <div>
                        <label className="mb-1 block text-xs font-semibold">
                          Qtd.
                        </label>
                        <input
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(index, "quantity", event.target.value)
                          }
                          className="w-full rounded-2xl border bg-white px-3 py-3 outline-none ring-blue-200 focus:ring-4"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold">
                          Modelo / descrição
                        </label>
                        <input
                          value={item.model}
                          onChange={(event) =>
                            updateItem(index, "model", event.target.value)
                          }
                          className="w-full rounded-2xl border bg-white px-4 py-3 outline-none ring-blue-200 focus:ring-4"
                          placeholder="Ex: Split 12.000 BTUs inverter"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={form.items.length === 1}
                        className="rounded-2xl p-3 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                        title="Remover item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Última visita
                  </label>
                  <input
                    type="date"
                    value={form.baseDate}
                    onChange={(event) =>
                      setForm({ ...form, baseDate: event.target.value })
                    }
                    className="w-full rounded-2xl border px-4 py-3 outline-none ring-blue-200 focus:ring-4"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Repetir a cada
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.intervalValue}
                    onChange={(event) =>
                      setForm({ ...form, intervalValue: event.target.value })
                    }
                    className="w-full rounded-2xl border px-4 py-3 outline-none ring-blue-200 focus:ring-4"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Período
                  </label>
                  <select
                    value={form.intervalType}
                    onChange={(event) =>
                      setForm({ ...form, intervalType: event.target.value })
                    }
                    className="w-full rounded-2xl border bg-white px-4 py-3 outline-none ring-blue-200 focus:ring-4"
                  >
                    <option value="weeks">Semanas</option>
                    <option value="months">Meses</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-3xl border border-blue-100 bg-blue-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-blue-700">
                    Próxima visita calculada
                  </p>
                  <p className="text-3xl font-black text-blue-950">
                    {formatDate(nextVisitDate)}
                  </p>
                </div>

                <CalendarDays className="text-blue-700" size={34} />
              </div>

              <button
                type="button"
                onClick={createClient}
                className="w-full rounded-2xl bg-blue-700 px-5 py-4 text-base font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800"
              >
                Salvar cliente
              </button>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-2xl bg-green-100 p-3 text-green-700">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black">
                    Mensagem padrão do WhatsApp
                  </h2>
                  <p className="text-sm text-slate-500">
                    Você pode editar o texto e usar variáveis automáticas.
                  </p>
                </div>
              </div>

              <div className="mb-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                Variáveis disponíveis:{" "}
                <strong>{"{nome}"}</strong>, <strong>{"{tecnico}"}</strong>,{" "}
                <strong>{"{telefone}"}</strong>, <strong>{"{endereco}"}</strong>,{" "}
                <strong>{"{data}"}</strong>, <strong>{"{itens}"}</strong>
              </div>

              <textarea
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
                className="min-h-40 w-full rounded-2xl border px-4 py-3 outline-none ring-green-200 focus:ring-4"
              />

              <button
                type="button"
                onClick={() => setTemplate(DEFAULT_TEMPLATE)}
                className="mt-3 inline-flex items-center gap-2 rounded-2xl border px-4 py-2 font-bold hover:bg-slate-50"
              >
                <RotateCcw size={16} />
                Restaurar padrão
              </button>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-2xl bg-yellow-100 p-3 text-yellow-700">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">
                      Alarmes e próximas visitas
                    </h2>
                    <p className="text-sm text-slate-500">
                      Clientes ordenados por prioridade.
                    </p>
                  </div>
                </div>

                <div className="relative w-full md:w-80">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full rounded-2xl border py-3 pl-11 pr-4 outline-none ring-blue-200 focus:ring-4"
                    placeholder="Buscar cliente, telefone ou item"
                  />
                </div>
              </div>

              {filteredClients.length === 0 ? (
                <div className="rounded-3xl border border-dashed p-10 text-center">
                  <p className="text-lg font-black text-slate-700">
                    Nenhum cliente cadastrado
                  </p>
                  <p className="mt-1 text-slate-500">
                    Cadastre o primeiro cliente para ver os alarmes aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredClients.map((client) => {
                    const status = getVisitStatus(client.nextVisitDate);
                    const message = buildMessage(
                      template,
                      client,
                      technicianName
                    );

                    return (
                      <article
                        key={client.id}
                        className="rounded-3xl border bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xl font-black">
                                {client.name}
                              </h3>
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-black ${status.className}`}
                              >
                                {status.label}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              WhatsApp: {client.phone}
                            </p>

                            <p className="text-sm text-slate-500">
                              Endereço: {client.address || "Não informado"}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-blue-50 p-3 text-left md:text-right">
                            <p className="text-xs font-bold uppercase text-blue-700">
                              Próxima visita
                            </p>
                            <p className="text-2xl font-black text-blue-950">
                              {formatDate(client.nextVisitDate)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm">
                          <strong>Itens/equipamentos:</strong>{" "}
                          {client.items
                            .map((item) => `${item.quantity}x ${item.model}`)
                            .join(" | ")}
                        </div>

                        <details className="mt-3 rounded-2xl bg-green-50 p-3 text-sm">
                          <summary className="cursor-pointer font-black text-green-800">
                            Ver mensagem pronta
                          </summary>
                          <pre className="mt-3 whitespace-pre-wrap font-sans text-slate-700">
                            {message}
                          </pre>
                        </details>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => copyMessage(client)}
                            className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 font-bold hover:bg-slate-50"
                          >
                            <Copy size={16} />
                            {copiedId === client.id
                              ? "Copiado!"
                              : "Copiar mensagem"}
                          </button>

                          <button
                            type="button"
                            onClick={() => openWhatsApp(client)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700"
                          >
                            <MessageCircle size={16} />
                            Abrir WhatsApp
                          </button>

                          <button
                            type="button"
                            onClick={() => renewVisit(client)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
                          >
                            <CalendarDays size={16} />
                            Visitado / reagendar
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteClient(client.id)}
                            className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-bold text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                            Excluir
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </main>

        <footer className="mt-8 rounded-3xl bg-slate-900 p-5 text-center text-sm text-slate-300">
          Manutenção em dia gera prevenção, organização e cliente recorrente.
        </footer>
      </div>
    </div>
  );
}
