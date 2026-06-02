import React from 'react'
import clsx from 'clsx'

export function Table({ children, className }) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full">{children}</table>
    </div>
  )
}

export function Thead({ children }) {
  return (
    <thead className="bg-gray-50 dark:bg-dark-700/50 border-b border-gray-100 dark:border-dark-700">
      {children}
    </thead>
  )
}

export function Th({ children, className }) {
  return <th className={clsx('table-header', className)}>{children}</th>
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-gray-50 dark:divide-dark-700">{children}</tbody>
}

export function Tr({ children, onClick, className }) {
  return (
    <tr
      onClick={onClick}
      className={clsx(
        'hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className }) {
  return <td className={clsx('table-cell', className)}>{children}</td>
}
