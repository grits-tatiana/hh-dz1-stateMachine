//создание единого лексического окружения
function initMachine() {
  const globalObjMachine = {};

  function Exception(message) {
    this.message = message;
  }

  function executeActions(action) {
    //проверка на тип задания функции
    function checkFuncOrStr(func) {
      if (typeof func === "function") {
        func(globalObjMachine.event);
      } else if (typeof func === "string") {
        if (globalObjMachine.machine.actions[func]) {
          globalObjMachine.machine.actions[func](globalObjMachine.event);
        } else
          throw new Exception(
            func + " не существует. Проверьте корректность ввода."
          );
      } else
        throw new Exception(
          "Неверный тип. Action может быть задан строкой или функцией."
        );
    }

    //проверка является ли action массивом
    if (Array.isArray(action)) {
      action.forEach(element => {
        checkFuncOrStr(element);
      });
    } else {
      checkFuncOrStr(action);
    }
  }

  function transitionFunc(transitionName, transitionData) {
    let states = globalObjMachine.machine.states;

    //проверка на завершенную транзакцию
    if (globalObjMachine.transit === false) {
      //если прошлая транзакция завершена, то начинается пришедшая
      globalObjMachine.transit = true;
      globalObjMachine.event = transitionData;

      //проверки на существование транзакции
      if (
        states[globalObjMachine.currentState] &&
        states[globalObjMachine.currentState].on
      ) {
        if (states[globalObjMachine.currentState].on[transitionName]) {
          //проверка на наличие сервиса
          if (
            states[globalObjMachine.currentState].on[transitionName].service
          ) {
            states[globalObjMachine.currentState].on[transitionName].service(
              transitionData
            );
          } else {
            //если не задан сервис, то происходит переход в заданный target
            const [state, setState] = useState();
            setState(
              states[globalObjMachine.currentState].on[transitionName].target
            );
          }
        } else
          throw new Exception(
            "Транзакции " +
              transitionName +
              " не существует. Проверьте корректность ввода."
          );
      } else
        throw new Exception(
          "В состоянии " +
            globalObjMachine.currentState +
            " блок описания транзакции не задан."
        );
    } else {
      //если прошлая транзакция не завершена, то пришедшая помещается в очередь
      globalObjMachine.transitQueue.push({
        tN: transitionName,
        tD: transitionData
      });
    }
  }

  function machine(objMachine) {
    //заполнение полей глобального объекта
    globalObjMachine.machine = objMachine;
    globalObjMachine.currentState = objMachine.initialState;
    globalObjMachine.transitQueue = [];
    globalObjMachine.transit = false;

    let objTransition = {
      transition: transitionFunc,
      global: globalObjMachine
    };

    return objTransition;
  }

  function useContext() {
    function setContext(newCont) {
      //слияние контекстов
      globalObjMachine.machine.context = Object.assign(
        {},
        globalObjMachine.machine.context,
        newCont
      );
    }

    return [globalObjMachine.machine.context, setContext];
  }

  function useState() {
    function setState(newState) {
      //проверка на совпадение "нового" состояния с текущим
      if (newState !== globalObjMachine.currentState) {
        //вызов onExit
        if (
          globalObjMachine.machine.states[globalObjMachine.currentState].onExit
        )
          executeActions(
            globalObjMachine.machine.states[globalObjMachine.currentState]
              .onExit
          );

        //присваивание нового состояния
        globalObjMachine.currentState = newState;

        //вызов onEntry
        if (
          globalObjMachine.machine.states[globalObjMachine.currentState].onEntry
        )
          executeActions(
            globalObjMachine.machine.states[globalObjMachine.currentState]
              .onEntry
          );

        //удаление данных завершающейся транзакции
        globalObjMachine.event = null;

        //флаг завершения транзакции
        globalObjMachine.transit = false;

        //если очередь не пуста, выполнение следующих транзакций
        while (globalObjMachine.transitQueue.length > 0) {
          let transitInfo = globalObjMachine.transitQueue.shift();
          transitionFunc(transitInfo.tN, transitInfo.tD);
        }
      }
    }

    return [globalObjMachine.currentState, setState];
  }

  return [machine, useContext, useState];
}

let returnInit = initMachine();
export const machine = returnInit[0];
export const useContext = returnInit[1];
export const useState = returnInit[2];
