import { useState, useEffect } from 'react';
import { ShoppingCart, Utensils, Clock, Send, X, Salad } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Dish {
  id: string;
  name: string;
  description: string;
  image_url: string;
  day_of_week: number;
}

interface CartItem {
  id: string;
  name: string;
}

interface AdminSettings {
  id: string;
  opening_time: string;
  closing_time: string;
}

const DAYS_OF_WEEK = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export default function UserMenu() {
  const [mainDishes, setMainDishes] = useState<Dish[]>([]);
  const [optionalDishes, setOptionalDishes] = useState<Dish[]>([]);
  const [salads, setSalads] = useState<Dish[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [userName, setUserName] = useState('');
  const [registration, setRegistration] = useState('');
  const [observations, setObservations] = useState('');
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentDay] = useState(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day;
  });

  // Input validation functions
  const validateName = (value: string) => {
    return /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(value);
  };

  const validateRegistration = (value: string) => {
    return /^\d{4}$/.test(value);
  };

  const validateObservations = (value: string) => {
    return /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s.,!?-]*$/.test(value);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || validateName(value)) {
      setUserName(value);
    }
  };

  const handleRegistrationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (value.length <= 4 && /^\d*$/.test(value))) {
      setRegistration(value);
    }
  };

  const handleObservationsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value === '' || validateObservations(value)) {
      setObservations(value);
    }
  };

  useEffect(() => {
    fetchDishes();
    fetchSettings();
    checkStoreStatus();
    const interval = setInterval(checkStoreStatus, 60000);
    return () => clearInterval(interval);
  }, [settings]);

  const fetchDishes = async () => {
    const { data: main } = await supabase
      .from('main_dishes')
      .select('*')
      .order('day_of_week', { ascending: true });
    
    const { data: optional } = await supabase
      .from('optional_dishes')
      .select('*')
      .order('day_of_week', { ascending: true });
      
    const { data: saladData } = await supabase
      .from('salads')
      .select('*')
      .order('day_of_week', { ascending: true });

    if (main) setMainDishes(main);
    if (optional) setOptionalDishes(optional);
    if (saladData) setSalads(saladData);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from('admin_settings').select('*').single();
    if (data) setSettings(data);
  };

  const checkStoreStatus = () => {
    if (!settings) return;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const dayOfWeek = now.getDay();
    
    if (dayOfWeek === 0) {
      setIsStoreOpen(false);
      return;
    }
    
    const [openHours, openMinutes] = settings.opening_time.split(':').map(Number);
    const [closeHours, closeMinutes] = settings.closing_time.split(':').map(Number);
    
    const openingTime = openHours * 60 + openMinutes;
    const closingTime = closeHours * 60 + closeMinutes;
    
    setIsStoreOpen(currentTime >= openingTime && currentTime <= closingTime);
  };

  const addToCart = (dish: Dish) => {
    if (!isStoreOpen) {
      toast.error('Restaurante fechado no momento');
      return;
    }

    if (cart.some(item => item.id === dish.id)) {
      toast.error('Item já está no carrinho');
      return;
    }

    setCart([...cart, { id: dish.id, name: dish.name }]);
    toast.success('Item adicionado ao carrinho');
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
    toast.success('Item removido do carrinho');
  };

  const handleSubmitOrder = async () => {
    // Validate all fields before submission
    if (!userName || !validateName(userName)) {
      toast.error('Por favor, insira um nome válido (apenas letras)');
      return;
    }

    if (!registration || !validateRegistration(registration)) {
      toast.error('Por favor, insira uma matrícula válida (4 dígitos)');
      return;
    }

    if (observations && !validateObservations(observations)) {
      toast.error('Por favor, insira observações válidas (apenas texto e pontuação básica)');
      return;
    }

    if (cart.length === 0) {
      toast.error('Adicione itens ao carrinho');
      return;
    }

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            user_name: userName,
            registration,
            observations,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: order.id,
        dish_id: item.id,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success('Pedido realizado com sucesso!');
      setCart([]);
      setUserName('');
      setRegistration('');
      setObservations('');
      setIsCartOpen(false);
    } catch (error) {
      toast.error('Erro ao realizar pedido');
    }
  };

  const groupDishesByDay = (dishes: Dish[]) => {
    const grouped: { [key: number]: Dish[] } = {};
    for (let i = 1; i <= 6; i++) {
      grouped[i] = dishes.filter(dish => dish.day_of_week === i);
    }
    return grouped;
  };

  const mainDishesByDay = groupDishesByDay(mainDishes);
  const optionalDishesByDay = groupDishesByDay(optionalDishes);
  const saladsByDay = groupDishesByDay(salads);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <img 
              src="https://www.cinbal.com.br/wp-content/uploads/2023/02/Logo-cinbal.png" 
              alt="Cinbal Logo" 
              className="h-10 sm:h-12 object-contain"
            />
            <h1 
              className="text-2xl sm:text-3xl font-bold text-gray-900 text-center"
              style={{ fontFamily: "'Palace Script MT', cursive" }}
            >
              Restaurante Benito Gomes
            </h1>
          </div>
          <div className="mt-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>
                {settings
                  ? `Horário: ${settings.opening_time} - ${settings.closing_time}`
                  : 'Carregando horário...'}
              </span>
            </div>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-1 ${isStoreOpen ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{isStoreOpen ? 'Aberto' : 'Fechado'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        <div className="mb-8">
          {[1, 2, 3, 4, 5, 6].map((day) => (
            <div key={day} className={`mb-12 ${day === currentDay ? 'relative' : ''}`}>
{/*               <h2 className="text-2xl font-bold mb-6 text-gray-800">
                {DAYS_OF_WEEK[day]}
                {day === currentDay && (
                  <span className="ml-2 inline-block px-3 py-1 text-sm font-semibold text-white bg-green-500 rounded-full">
                    Hoje
                  </span>
                )}
              </h2> */}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-700">
                    <Utensils className="w-5 h-5 mr-2" />
                    Pratos Principais
                  </h3>
                  <div className="space-y-4">
                    {mainDishesByDay[day]?.map((dish) => (
                      <div key={dish.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                        {dish.image_url && (
                          <img
                            src={dish.image_url}
                            alt={dish.name}
                            className="w-full h-48 object-cover"
                          />
                        )}
                        <div className="p-4">
                          <h4 className="text-lg font-semibold">{dish.name}</h4>
                          <p className="text-gray-600 mt-1">{dish.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-700">
                    <Salad className="w-5 h-5 mr-2" />
                    Saladas
                  </h3>
                  <div className="space-y-4">
                    {saladsByDay[day]?.map((dish) => (
                      <div key={dish.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                        {dish.image_url && (
                          <img
                            src={dish.image_url}
                            alt={dish.name}
                            className="w-full h-48 object-cover"
                          />
                        )}
                        <div className="p-4">
                          <h4 className="text-lg font-semibold">{dish.name}</h4>
                          <p className="text-gray-600 mt-1">{dish.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-700">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Opções do Dia
                  </h3>
                  <div className="space-y-4">
                    {optionalDishesByDay[day]?.map((dish) => (
                      <div key={dish.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                        {dish.image_url && (
                          <img
                            src={dish.image_url}
                            alt={dish.name}
                            className="w-full h-48 object-cover"
                          />
                        )}
                        <div className="p-4">
                          <h4 className="text-lg font-semibold">{dish.name}</h4>
                          <p className="text-gray-600 mt-1">{dish.description}</p>
                          <button
                            onClick={() => addToCart(dish)}
                            className="mt-2 px-4 py-2 text-white rounded-md transition-colors bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            disabled={!isStoreOpen}
                          >
                            Adicionar ao Pedido
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating Cart Button */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="fixed right-4 bottom-4 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-colors z-20"
      >
        <ShoppingCart className="w-6 h-6" />
        {cart.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">
            {cart.length}
          </span>
        )}
      </button>

      {/* Floating Cart Panel */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30">
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Seu Pedido</h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                {cart.length === 0 ? (
                  <p className="text-gray-600">Seu carrinho está vazio</p>
                ) : (
                  <ul className="space-y-2">
                    {cart.map((item) => (
                      <li key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <span>{item.name}</span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={handleNameChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Digite seu nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Matrícula (4 dígitos)</label>
                  <input
                    type="text"
                    value={registration}
                    onChange={handleRegistrationChange}
                    maxLength={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Observações</label>
                  <textarea
                    value={observations}
                    onChange={handleObservationsChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    rows={3}
                    placeholder="Alguma observação sobre seu pedido?"
                  />
                </div>

                <button
                  onClick={handleSubmitOrder}
                  disabled={!isStoreOpen || cart.length === 0}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
