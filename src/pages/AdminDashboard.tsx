/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, Download, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';

interface Dish {
  id: string;
  name: string;
  description: string;
  image_url: string;
  day_of_week: number;
}

interface Order {
  id: string;
  user_name: string;
  registration: string;
  observations: string;
  created_at: string;
  items: Array<{
    dish_name: string;
  }>;
}

interface AdminSettings {
  id: string;
  opening_time: string;
  closing_time: string;
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [mainDishes, setMainDishes] = useState<Dish[]>([]);
  const [optionalDishes, setOptionalDishes] = useState<Dish[]>([]);
  const [salads, setSalads] = useState<Dish[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [newDish, setNewDish] = useState({
    name: '',
    description: '',
    image_url: '',
    day_of_week: 1,
  });
  const [dishType, setDishType] = useState('optional'); // 'main', 'optional', or 'salad'

  useEffect(() => {
    fetchDishes();
    fetchOrders();
    fetchSettings();
  }, []);

  const fetchDishes = async () => {
    const { data: main } = await supabase.from('main_dishes').select('*');
    const { data: optional } = await supabase
      .from('optional_dishes')
      .select('*');
    const { data: saladData } = await supabase
      .from('salads')
      .select('*');
    
    if (main) setMainDishes(main);
    if (optional) setOptionalDishes(optional);
    if (saladData) setSalads(saladData);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(
        `
        *,
        items:order_items(
          dish:optional_dishes(name)
        )
      `
      )
      .order('created_at', { ascending: false });

    if (data) {
      setOrders(
        data.map((order) => ({
          ...order,
          items: order.items.map((item: any) => ({
            dish_name: item.dish?.name || 'Item indisponível',
          })),
        }))
      );
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('admin_settings')
      .select('*')
      .single();
    if (data) {
      setSettings(data);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleBackToMenu = () => {
    navigate('/menu');
  };

  const updateSettings = async () => {
    if (!settings) return;

    const { error } = await supabase
      .from('admin_settings')
      .update({
        opening_time: settings.opening_time,
        closing_time: settings.closing_time,
      })
      .eq('id', settings.id);

    if (error) {
      toast.error('Erro ao atualizar horário');
    } else {
      toast.success('Horário atualizado com sucesso');
    }
  };

  const addDish = async () => {
    let table = 'optional_dishes';
    
    if (dishType === 'main') {
      table = 'main_dishes';
    } else if (dishType === 'salad') {
      table = 'salads';
    }
    
    const { error } = await supabase.from(table).insert([newDish]);

    if (error) {
      toast.error('Erro ao adicionar prato');
    } else {
      toast.success('Prato adicionado com sucesso');
      fetchDishes();
      setNewDish({
        name: '',
        description: '',
        image_url: '',
        day_of_week: 1,
      });
    }
  };

  const deleteDish = async (id: string, type: string) => {
    let table = 'optional_dishes';
    
    if (type === 'main') {
      table = 'main_dishes';
    } else if (type === 'salad') {
      table = 'salads';
    }
    
    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
      toast.error('Erro ao excluir prato');
    } else {
      toast.success('Prato excluído com sucesso');
      fetchDishes();
    }
  };

  const clearOrders = async () => {
    const confirmClear = window.confirm("Você tem certeza que deseja limpar todos os pedidos?");
    if (confirmClear) {
      try {
        // Primeiro deleta os itens dos pedidos
        const { error: itemsError } = await supabase
          .from('order_items')
          .delete()
          .not('id', 'is', null); // Deleta todos os itens

        if (itemsError) throw itemsError;

        // Depois deleta os pedidos
        const { error: ordersError } = await supabase
          .from('orders')
          .delete()
          .not('id', 'is', null); // Deleta todos os pedidos

        if (ordersError) throw ordersError;

        toast.success('Pedidos limpos com sucesso');
        setOrders([]); // Clear the local state
      } catch (error) {
        console.error('Erro ao limpar pedidos:', error);
        toast.error('Erro ao limpar pedidos. Verifique o console para mais detalhes.');
      }
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(16);
    doc.text('Relatório de Pedidos - Restaurante Benito Gomes', 20, yPos);
    yPos += 20;

    orders.forEach((order, index) => {
      doc.setFontSize(12);
      doc.text(`Pedido #${index + 1}`, 20, yPos);
      yPos += 10;
      doc.text(`Nome: ${order.user_name}`, 30, yPos);
      yPos += 10;
      doc.text(`Matrícula: ${order.registration}`, 30, yPos);
      yPos += 10;
      doc.text(
        `Data: ${format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}`,
        30,
        yPos
      );
      yPos += 10;
      doc.text('Itens:', 30, yPos);
      yPos += 10;

      order.items.forEach((item) => {
        doc.text(`- ${item.dish_name}`, 40, yPos);
        yPos += 10;
      });

      if (order.observations) {
        doc.text(`Observações: ${order.observations}`, 30, yPos);
        yPos += 10;
      }

      yPos += 10;

      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
    });

    doc.save('pedidos.pdf');
  };

  if (!settings) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Painel Administrativo
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleBackToMenu}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Voltar ao Cardápio
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </button>
          </div>
        </div>

        {/* Horário de Funcionamento */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Horário de Funcionamento
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Abertura
              </label>
              <input
                type="time"
                value={settings.opening_time}
                onChange={(e) =>
                  setSettings({ ...settings, opening_time: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fechamento
              </label>
              <input
                type="time"
                value={settings.closing_time}
                onChange={(e) =>
                  setSettings({ ...settings, closing_time: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
          <button
            onClick={updateSettings}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Salvar Horário
          </button>
        </div>

        {/* Adicionar Novo Prato */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Adicionar Novo Prato
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nome
              </label>
              <input
                type="text"
                value={newDish.name}
                onChange={(e) =>
                  setNewDish({ ...newDish, name: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Descrição
              </label>
              <input
                type="text"
                value={newDish.description}
                onChange={(e) =>
                  setNewDish({ ...newDish, description: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                URL da Imagem
              </label>
              <input
                type="text"
                value={newDish.image_url}
                onChange={(e) =>
                  setNewDish({ ...newDish, image_url: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Dia da Semana
              </label>
              <select
                value={newDish.day_of_week}
                onChange={(e) =>
                  setNewDish({
                    ...newDish,
                    day_of_week: parseInt(e.target.value),
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value={1}>Segunda-feira</option>
                <option value={2}>Terça-feira</option>
                <option value={3}>Quarta-feira</option>
                <option value={4}>Quinta-feira</option>
                <option value={5}>Sexta-feira</option>
                <option value={6}>Sábado</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dishType"
                  value="main"
                  checked={dishType === 'main'}
                  onChange={() => setDishType('main')}
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-600">
                  Prato Principal
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dishType"
                  value="optional"
                  checked={dishType === 'optional'}
                  onChange={() => setDishType('optional')}
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-600">
                  Prato Opcional
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dishType"
                  value="salad"
                  checked={dishType === 'salad'}
                  onChange={() => setDishType('salad')}
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-600">
                  Salada
                </span>
              </label>
            </div>
            <button
              onClick={addDish}
              className="ml-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Adicionar Prato
            </button>
          </div>
        </div>

        {/* Lista de Pratos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Pratos Principais */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Pratos Principais</h2>
            <div className="space-y-4">
              {mainDishes.map((dish) => (
                <div
                  key={dish.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{dish.name}</h3>
                    <p className="text-sm text-gray-600">{dish.description}</p>
                  </div>
                  <button
                    onClick={() => deleteDish(dish.id, 'main')}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Pratos Opcionais */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Pratos Opcionais</h2>
            <div className="space-y-4">
              {optionalDishes.map((dish) => (
                <div
                  key={dish.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{dish.name}</h3>
                    <p className="text-sm text-gray-600">{dish.description}</p>
                  </div>
                  <button
                    onClick={() => deleteDish(dish.id, 'optional')}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Saladas */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Saladas</h2>
            <div className="space-y-4">
              {salads.map((dish) => (
                <div
                  key={dish.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{dish.name}</h3>
                    <p className="text-sm text-gray-600">{dish.description}</p>
                  </div>
                  <button
                    onClick={() => deleteDish(dish.id, 'salad')}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pedidos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Pedidos</h2>
            <div className="flex gap-2">
              <button
                onClick={clearOrders}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Limpar Pedidos
              </button>
              <button
                onClick={generatePDF}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="p-4 border rounded-lg">
                <div className="flex justify-between">
                  <h3 className="font-medium">Pedido {order.user_name}</h3>
                  <span className="text-sm text-gray-600">
                    {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Matrícula: {order.registration}
                </p>
                <div className="mt-2">
                  <p className="text-sm font-medium">Itens:</p>
                  <ul className="list-disc list-inside">
                    {order.items.map((item, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        {item.dish_name}
                      </li>
                    ))}
                  </ul>
                </div>
                {order.observations && (
                  <p className="mt-2 text-sm text-gray-600">
                    Observações: {order.observations}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
