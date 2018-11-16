export default {
  namespaced: true,
  state: {
    preventUnload: false,
  },
  mutations: {
    setPreventUnload(state, bool) {
      state.preventUnload = bool
    },
  },
}
