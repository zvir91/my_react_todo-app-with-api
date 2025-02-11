/* eslint-disable jsx-a11y/control-has-associated-label */
import cn from 'classnames';
import {
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { UserWarning } from './UserWarning';
import { Header } from './Components/Header';
import { Section } from './Components/Section';
import { Footer } from './Components/Footer';
import { Todo } from './types/Todo';
import * as todoService from './api/todos';
import { filterTodos } from './utils/services';
import { Status } from './types/Status';

const USER_ID = 12083;

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [erroMessage, setErrorMessage] = useState('');
  const [statusTodo, setStatusTodo] = useState<Status>(Status.All);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTodosId, setLoadingTodosId] = useState<number[] | null>(null);

  const myInputRef = useRef<HTMLInputElement>(null);
  const showFooter = todos.length > 0;

  const handleClearCompleted = () => {
    const completedTodosId = todos.filter(
      todo => todo.completed,
    ).map(todo => todo.id);

    setLoadingTodosId(completedTodosId);

    Promise.all(completedTodosId.map(id => {
      setIsLoading(true);

      return todoService.deleteTodo(id)
        .then(() => {
          setTodos(
            currentTodos => currentTodos.filter(
              curTodo => curTodo.id !== id,
            ),
          );
        })
        .catch((err) => {
          setErrorMessage('Unable to delete a todo');
          throw err;
        });
    }))
      .catch((err) => {
        setErrorMessage('Unable to delete a todo');
        throw err;
      })
      .finally(() => {
        setIsLoading(false);
        setLoadingTodosId(null);
        setTimeout(() => {
          setErrorMessage('');
        }, 3000);
        myInputRef.current?.focus();
      });
  };

  useEffect(() => {
    setErrorMessage('');
    todoService.getTodos(USER_ID)
      .then((response: SetStateAction<Todo[]>) => setTodos(response))
      .catch(() => setErrorMessage('Unable to load todos'))
      .finally(() => setInterval(() => setErrorMessage(''), 3000));
  }, []);

  function addTodo({
    title,
    userId,
    completed,
  }: Todo) {
    setErrorMessage('');

    const newTamperTodo = {
      title,
      userId,
      completed,
      id: 0,
    };

    if (!title.trim()) {
      setErrorMessage('Title should not be empty');
      setTimeout(() => {
        myInputRef.current?.focus();
      }, 0);

      return Promise.resolve();
    }

    setTempTodo(newTamperTodo);

    return todoService.addTodo({
      title,
      userId,
      completed,
    })
      .then(
        (newTodo: Todo) => {
          if (newTodo.title) {
            setTodos(currentTodos => [...currentTodos, newTodo]);
          }
        },
      )
      .catch((err: unknown) => {
        setErrorMessage('Unable to add a todo');
        setTimeout(() => {
          myInputRef.current?.focus();
        }, 0);
        throw err;
      })
      .finally(() => {
        setInterval(() => setErrorMessage(''), 3000);
        setTempTodo(null);
      });
  }

  const handleAddTodo = (newTodo: Todo) => {
    return addTodo(newTodo);
  };

  async function deleteTodo(id: number) {
    const newTamperTodo = todos.find(todo => todo.id === id);

    if (newTamperTodo) {
      setSelectedTodo(newTamperTodo);
    }

    setIsLoading(true);

    return todoService.deleteTodo(id)
      .then(() => {
        setTodos(currentPosts => currentPosts.filter(todo => todo.id !== id));
        setTimeout(() => {
          myInputRef.current?.focus();
        }, 0);
      })
      .catch((err) => {
        setTodos(todos);
        setErrorMessage('Unable to delete a todo');

        throw err;
      })
      .finally(() => {
        setIsLoading(false);
        setInterval(() => setErrorMessage(''), 3000);
      });
  }

  const handleDeleteTodo = (id: number) => {
    deleteTodo(id);
  };

  async function updateTitleTodo(updatedTodo: Todo) {
    setSelectedTodo(updatedTodo);
    const isSameTitle = todos.some(todo => todo.title === updatedTodo.title);

    if (!updatedTodo.title.trim()) {
      await deleteTodo(updatedTodo.id);

      return;
    }

    if (isSameTitle) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    await todoService.updateTodo(updatedTodo)
      .then((newTodo) => {
        setTodos(currentTodos => {
          const newTodos = [...currentTodos];
          const index = currentTodos.findIndex(
            todo => todo.id === updatedTodo.id,
          );

          newTodos.splice(index, 1, newTodo);

          return newTodos;
        });
      })
      .catch((error) => {
        setErrorMessage('Unable to update a todo');

        throw error;
      })
      .finally(() => {
        setInterval(() => setErrorMessage(''), 3000);
        setIsLoading(false);
        setSelectedTodo(null);
      });
  }

  const handleDubleClick = async (newValue: Todo) => {
    await updateTitleTodo(newValue);
  };

  function updateComplitedTodos(updatedTodo: Todo) {
    setErrorMessage('');
    setIsLoading(true);

    todoService.updateTodo(updatedTodo)
      .then((newTodo) => {
        setTodos(currentTodos => {
          const newTodos = [...currentTodos];
          const index = currentTodos.findIndex(
            todo => todo.id === updatedTodo.id,
          );

          newTodos.splice(index, 1, newTodo);

          return newTodos;
        });
      })

      .catch((err) => {
        setErrorMessage('Unable to update a todo');
        throw err;
      })
      .finally(() => {
        setInterval(() => setErrorMessage(''), 3000);
        setIsLoading(false);
      });
  }

  const handleToggleButton = () => {
    const isAllCompleted = todos.every(todo => todo.completed);

    if (isAllCompleted) {
      const todosId = todos.map(todo => todo.id);

      setTimeout(() => {
        setIsLoading(true);
        setLoadingTodosId(todosId);
      }, 0);

      Promise.all(todos.map(async todo => {
        try {
          return await todoService.updateTodo({ ...todo, completed: false });
        } catch (err) {
          setErrorMessage('Unable to update todos');

          return todo;
        } finally {
          setInterval(() => setErrorMessage(''), 3000);
        }
      }))
        .then((upTodos) => {
          setTodos(upTodos);
        })
        .catch(() => {
          setTodos(todos);
          setErrorMessage('Unable to update todos');
        })
        .finally(() => {
          setInterval(() => setErrorMessage(''), 3000);
          setIsLoading(false);
          setLoadingTodosId(null);
        });
    }

    const isActiveTodo = todos.some(todo => !todo.completed);

    if (isActiveTodo) {
      const notComplitedTodo = todos.filter(todo => !todo.completed);
      const todosId = notComplitedTodo.map(todo => todo.id);

      setLoadingTodosId(todosId);
      setIsLoading(true);

      const complitedTodos = todos.filter(todo => todo.completed);

      Promise.all(notComplitedTodo.map(async todo => {
        try {
          const updateTodo = { ...todo, completed: true };
          const newTodo = await todoService.updateTodo(updateTodo);

          return newTodo;
        } catch (error) {
          return todo;
        }
      }))
        .then(upTodos => {
          setTodos([...complitedTodos, ...upTodos]);
        })
        .catch(() => {
          setErrorMessage('Unable to update todos');
        })
        .finally(() => {
          setInterval(() => setErrorMessage(''), 3000);
          setLoadingTodosId(null);
          setIsLoading(false);
        });
    }
  };

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <Header
          userId={USER_ID}
          onSubmit={handleAddTodo}
          selectedTodo={selectedTodo}
          todos={todos}
          myInputRef={myInputRef}
          setAllCompleted={handleToggleButton}
        />

        <Section
          onSelect={async (newValue) => {
            setSelectedTodo(newValue);
            await updateComplitedTodos(newValue);
          }}
          onDubleClick={handleDubleClick}
          filteredTodos={filterTodos(statusTodo, todos)}
          onDelete={handleDeleteTodo}
          tempTodo={tempTodo}
          isLoading={isLoading}
          loadingTodosId={loadingTodosId}
          selectedTodo={selectedTodo}
        />

        {showFooter && (
          <Footer
            onStatus={(newStatus: Status) => setStatusTodo(newStatus)}
            status={statusTodo}
            todos={todos}
            handleClearCompleted={handleClearCompleted}
          />
        )}

      </div>

      <div
        data-cy="ErrorNotification"
        className={cn(
          'notification is-dangers-light has-text-weight-normal',
          { hidden: !erroMessage },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setErrorMessage('')}
        />
        {erroMessage}
      </div>
    </div>
  );
};
