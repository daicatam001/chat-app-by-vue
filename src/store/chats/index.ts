import { ActionContext } from 'vuex'
import { AppState } from '@/store'
import { Chat } from '@/core/models/chats'
import {
  createChat,
  getChats,
  getLatestChats,
  searchChats
} from '@/core/api/chats'
import moment from 'moment'
import { MessageEntities } from '../messages'
import { Message } from '@/core/models/messages'

export interface ChatEntities {
  [key: number]: ChatMessage
}
export interface ChatMessage extends Chat {
  messageEntities: MessageEntities
}
export interface ChatsState {
  newChatTitle: string
  selectedChatId: number
  chatEntites: ChatEntities
  isSearching: boolean
  query: string
  searchedChats: Partial<Chat>[]
}

export default {
  namespaced: true,
  state: {
    chatEntites: {},
    selectedChatId: null,
    newChatTitle: '',
    query: '',
    isSearching: false,
    searchedChats: []
  },
  actions: {
    onInput(
      { commit }: ActionContext<ChatsState, AppState>,
      payload: string
    ): void {
      commit('setNewChatTitle', payload)
    },
    async createNewChat({
      state,
      commit
    }: ActionContext<ChatsState, AppState>): Promise<void> {
      if (!state.newChatTitle) {
        return
      }
      try {
        await createChat(state.newChatTitle)
        commit('setNewChatTitle', '')
      } catch (e) {
        // ..
      }
    },
    selectChat(
      { commit, dispatch }: ActionContext<ChatsState, AppState>,
      payload: number
    ): void {
      commit('setSelectedChatId', payload)
      dispatch('messages/loadChatMessages', null, { root: true })
    },
    async getChats({
      commit
    }: ActionContext<ChatsState, AppState>): Promise<void> {
      const { data } = await getChats()
      const chatEntites = (data as Chat[]).reduce((entity, chat) => {
        chat.last_message.custom_json = JSON.parse(
          chat.last_message.custom_json
        )
        return { ...entity, [chat.id]: { ...chat } }
      }, {})

      commit('setChatEntities', chatEntites)
    },
    async getLatestChats(
      { commit }: ActionContext<ChatsState, AppState>,
      payload: number
    ): Promise<void> {
      const { data } = await getLatestChats(payload)
      const chatEntites = (data as Chat[]).reduce((entity, chat) => {
        chat.last_message.custom_json = JSON.parse(
          chat.last_message.custom_json
        )
        return {
          ...entity,
          [chat.id]: { ...chat, messageEntities: {} }
        }
      }, {})
      commit('setChatEntities', chatEntites)
    },
    async updateChat(
      { commit }: ActionContext<ChatsState, AppState>,
      payload: Chat
    ): Promise<void> {
      commit('updateChat', payload)
    },
    async searchChats(
      { commit, rootGetters }: ActionContext<ChatsState, AppState>,
      payload: string
    ): Promise<void> {
      commit('setQuery', payload)
      if (!payload) {
        commit('setSearchedChats', [])
        return
      }
      commit('setIsSearching', true)
      const username = rootGetters['auth/username']
      let result = [] as Partial<Chat>[]
      const { data } = await searchChats(payload, username)
      if (data.length) {
        result = result.concat([
          {
            title: 'Trò chuyện',
            isHeading: true,
            id: 'conversation'
          } as Partial<Chat>,
          ...data
        ])
      }
      commit('setSearchedChats', result)
      commit('setIsSearching', false)
    },
    offSearchChats({ commit }: ActionContext<ChatsState, AppState>) {
      commit('setQuery', '')
      commit('setSearchedChats', [])
    },
    setMessageEntities(
      { commit }: ActionContext<ChatsState, AppState>,
      payload: { chatId: number; message: MessageEntities }
    ) {
      commit('setMessageEntities', payload)
    },
    addMessage(
      { commit }: ActionContext<ChatsState, AppState>,
      payload: { chatId: number; message: Message }
    ) {
      commit('addMessage', payload)
    },
    editMessage(
      { commit }: ActionContext<ChatsState, AppState>,
      payload: { chatId: number; message: Message }
    ) {
      commit('editMessage', payload)
    },
    setLastMessage(
      { commit }: ActionContext<ChatsState, AppState>,
      payload: { chatId: number; message: Message }
    ) {
      commit('setLastMessage', payload)
    }
  },
  mutations: {
    setSelectedChatId(state: ChatsState, payload: number): void {
      state.selectedChatId = payload
    },
    setNewChatTitle(state: ChatsState, payload: string): void {
      state.newChatTitle = payload
    },
    setChatEntities(state: ChatsState, payload: ChatEntities): void {
      state.chatEntites = payload
    },
    updateChat(state: ChatsState, payload: Chat): void {
      state.chatEntites[payload.id] = {
        ...state.chatEntites[payload.id],
        ...payload
      }
    },
    setSearchedChats(state: ChatsState, payload: Partial<Chat>[]) {
      state.searchedChats = [ ...payload ]
    },
    setQuery(state: ChatsState, payload: string) {
      state.query = payload
    },
    setIsSearching(state: ChatsState, payload: boolean) {
      state.isSearching = payload
    },
    setMessageEntities(
      state: ChatsState,
      payload: { chatId: number; messageEntities: MessageEntities }
    ) {
      state.chatEntites[payload.chatId].messageEntities = {
        ...payload.messageEntities
      }
    },
    addMessage(
      state: ChatsState,
      { chatId, message }: { chatId: number; message: Message }
    ) {
      // state.chatEntites[chatId].last_message = { ...message }
      state.chatEntites[chatId].last_message = { ...message }
      state.chatEntites[chatId].messageEntities[
        message.custom_json.sending_time
      ] = {
        ...message
      }
    },
    editMessage(
      state: ChatsState,
      { chatId, message }: { chatId: number; message: Message }
    ) {
      if (state.chatEntites[chatId].last_message.id === message.id) {
        state.chatEntites[chatId].last_message = { ...message }
      }
      state.chatEntites[chatId].messageEntities[
        message.custom_json.sending_time
      ] = {
        ...message
      }
    },
    setLastMessage(
      state: ChatsState,
      { chatId, message }: { chatId: number; message: Message }
    ) {
      state.chatEntites[chatId].last_message = { ...message }
    }
  },
  getters: {
    selectedChatId(state: ChatsState): number {
      return state.selectedChatId
    },
    selectedMessageEntities(
      state: ChatsState,
      { selectedChatId }
    ): MessageEntities | undefined | null {
      return selectedChatId
        ? state.chatEntites[selectedChatId].messageEntities
        : null
    },
    newChatTitle(state: ChatsState): string {
      return state.newChatTitle
    },
    hasSelectedChat(state, { selectedChatId }): boolean {
      return !!selectedChatId
    },
    chatEntities({ chatEntites }: ChatsState) {
      return chatEntites
    },
    searchedChats({ searchedChats }: ChatsState) {
      console.log(searchedChats)
      return searchedChats
    },
    isSearching({ isSearching }: ChatsState) {
      return isSearching
    },
    query({ query }: ChatsState) {
      return query
    },
    noSearchResult(state, { query, searchedChats }) {
      return !!query && !searchedChats.length
    },
    chats(state: ChatsState, { searchedChats, chatEntities }): Chat[] {
      if (searchedChats.length) {
        return searchedChats
      }
      return Object.values(chatEntities as ChatEntities).sort(
        (a: Chat, b: Chat) => {
          const lastMessageA = moment(
            a.last_message ? a.last_message.created : a.created
          )
          const lastMessageB = moment(
            b.last_message ? b.last_message.created : b.created
          )
          if (lastMessageA.isAfter(lastMessageB)) {
            return -1
          }
          if (lastMessageA.isBefore(lastMessageB)) {
            return 1
          }
          return 0
        }
      )
    }
  }
}
